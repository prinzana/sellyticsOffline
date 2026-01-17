// enterprise/hooks/useScannerIntegration.js
// Unified barcode scanner integration for ALL workflows
// Extends existing useBarcodeScanner with persistent identifier storage

import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../../../../supabaseClient";
import toast from "react-hot-toast";

/**
 * UNIFIED SCANNER INTEGRATION
 * 
 * Use this hook in ANY workflow that needs barcode scanning:
 * - Stock-In
 * - Dispatch
 * - Transfers
 * - Returns/Restocking
 * - Product Creation
 * - Inventory Updates
 * 
 * Features:
 * - Real-time scanning with duplicate detection
 * - Persistent identifier storage (warehouse_product_identifiers)
 * - Auto-quantity calculation for SERIALIZED products
 * - Works with existing scan session infrastructure
 */

export function useScannerIntegration({
  warehouseId,
  clientId,
  productId = null,
  productType = "STANDARD", // SERIALIZED, BATCH, STANDARD
  workflow = "stock_in", // stock_in, dispatch, transfer, return, create, update
  userId,
  onScanComplete,
  preventDuplicates = true,
}) {
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Computed stats
  const uniqueCount = new Set(scannedItems.map(i => i.value?.toLowerCase().trim())).size;
  const totalCount = scannedItems.length;
  const duplicateCount = totalCount - uniqueCount;

  // Calculate quantity based on product type
  const calculatedQuantity = productType === "SERIALIZED"
    ? uniqueCount
    : productType === "BATCH"
      ? totalCount
      : 1;

  // Start scan session
  const startSession = useCallback(async () => {
    if (!warehouseId) {
      toast.error("Warehouse ID required");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("warehouse_scan_sessions")
        .insert({
          warehouse_id: warehouseId,
          client_id: clientId,
          created_by: userId,
          status: "ACTIVE",
          session_type: workflow.toUpperCase(),
        })
        .select("id")
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setIsActive(true);
      setScannedItems([]);
      setDuplicates([]);
      toast.success("Scanner activated");
      return true;
    } catch (error) {
      console.error("Failed to start scan session:", error);
      toast.error("Failed to start scanner");
      return false;
    }
  }, [warehouseId, clientId, userId, workflow]);

  // Stop scan session
  const stopSession = useCallback(async () => {
    if (sessionId) {
      await supabase
        .from("warehouse_scan_sessions")
        .update({ status: "CLOSED", closed_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    setIsActive(false);
    setSessionId(null);
  }, [sessionId]);

  // Toggle scanner on/off
  const toggleScanner = useCallback(async () => {
    if (isActive) {
      await stopSession();
    } else {
      await startSession();
    }
  }, [isActive, startSession, stopSession]);

  // Process a scan (from input or camera)
  const processScan = useCallback(async (value) => {
    if (!value?.trim() || !sessionId) return { success: false };

    const trimmedValue = value.trim();

    // Check for duplicates in current session
    const isDuplicate = scannedItems.some(
      item => item.value?.toLowerCase() === trimmedValue.toLowerCase()
    );

    // BATCH MODE: Enforce only one unique barcode per session
    if (productType === "BATCH") {
      const hasEffectiveBarcode = scannedItems.length > 0;
      const currentBatchBarcode = scannedItems[0]?.value?.toLowerCase();

      // If we already have scans, new scan MUST match the existing batch barcode
      if (hasEffectiveBarcode && currentBatchBarcode !== trimmedValue.toLowerCase()) {
        toast.error("Batch products must share the same barcode", { icon: "🚫" });
        return { success: false, error: "Multi-barcode batch not allowed" };
      }
    }

    if (isDuplicate && preventDuplicates && productType === "SERIALIZED") {
      setDuplicates(prev => [...prev, trimmedValue]);
      toast.error(`Duplicate: ${trimmedValue}`, { icon: "⚠️", duration: 2000 });
      return { success: false, isDuplicate: true };
    }

    // NEW: Strict Global Duplicate Check against Database
    if (productType === "SERIALIZED" && preventDuplicates) {
      try {
        const { data: globalExists, error: globalError } = await supabase
          .from("warehouse_serials")
          .select("serial_number")
          .eq("serial_number", trimmedValue)
          .limit(1)
          .maybeSingle();

        if (globalError) throw globalError;

        if (globalExists) {
          toast.error(`Already in System: ${trimmedValue}`, {
            icon: "🚫",
            duration: 3000,
            style: { border: '1px solid #ef4444', padding: '16px', color: '#b91c1c' }
          });
          return { success: false, error: "Global Duplicate" };
        }
      } catch (dbErr) {
        console.error("Global duplicate check failed:", dbErr);
        // We allow scan to proceed on network error to avoid blocking workflow,
        // or we could block. Let's block to be safe as per "strict" requirement.
        toast.error("Database check failed. Try again.");
        return { success: false, error: "DB Error" };
      }
    }

    try {
      // Save to scan_events (existing table)
      // NOTE: warehouse_scan_events.created_by is INTEGER, but we have an email string.
      // We only send created_by if it's a number to avoid "invalid input syntax" error.
      const payload = {
        session_id: sessionId,
        scanned_value: trimmedValue,
        is_duplicate: isDuplicate && productType !== "BATCH", // For Batch, re-scans are NOT "duplicates", they count as qty
        detected_product_id: productId,
        notes: workflow,
      };

      if (typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId))) {
        payload.created_by = parseInt(userId);
      }

      const { data: scanEvent, error } = await supabase
        .from("warehouse_scan_events")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newItem = {
        id: scanEvent.id,
        value: trimmedValue,
        scannedAt: new Date().toISOString(),
        isDuplicate: isDuplicate && productType !== "BATCH",
      };

      setScannedItems(prev => [...prev, newItem]);

      if (!isDuplicate || productType === "BATCH") {
        toast.success(productType === "BATCH" ? `Qty Increased (+1)` : "Scanned!", { duration: 800 });
      }

      onScanComplete?.(newItem, scannedItems.length + 1);

      return { success: true, data: newItem };
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Scan failed");
      return { success: false, error };
    }
  }, [sessionId, scannedItems, preventDuplicates, productType, userId, productId, workflow, onScanComplete]);

  // Handle manual input submission
  const handleInputSubmit = useCallback((e) => {
    e?.preventDefault();
    if (inputValue.trim()) {
      processScan(inputValue);
      setInputValue("");
    }
  }, [inputValue, processScan]);

  // Remove a scan from the list
  const removeScan = useCallback(async (scanId) => {
    try {
      const { error } = await supabase
        .from("warehouse_scan_events")
        .delete()
        .eq("id", scanId);

      if (error) throw error;

      setScannedItems(prev => prev.filter(item => item.id !== scanId));
      toast.success("Removed");
    } catch (error) {
      console.error("Remove scan error:", error);
      toast.error("Failed to remove");
    }
  }, []);

  // Clear all scans in session
  const clearAll = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from("warehouse_scan_events")
        .delete()
        .eq("session_id", sessionId);

      if (error) throw error;

      setScannedItems([]);
      setDuplicates([]);
      toast.success("All scans cleared");
    } catch (error) {
      console.error("Clear error:", error);
      toast.error("Failed to clear");
    }
  }, [sessionId]);

  // COMMIT: Save identifiers permanently to warehouse_serials
  const commitIdentifiers = useCallback(async (targetProductId, ledgerEntryId = null) => {
    if (scannedItems.length === 0) return { success: true, count: 0 };

    // Only persist for SERIALIZED products
    if (productType !== "SERIALIZED") {
      return { success: true, count: 0 };
    }

    try {
      const uniqueValues = [...new Set(
        scannedItems
          .filter(item => !item.isDuplicate)
          .map(item => item.value)
      )];

      if (uniqueValues.length === 0) return { success: true, count: 0 };

      // Insert into existing warehouse_serials table
      const serialsToInsert = uniqueValues.map(value => ({
        warehouse_id: warehouseId,
        product_id: targetProductId,
        client_id: clientId,
        serial_number: value,
        status: "IN_STOCK",
        last_ledger_id: ledgerEntryId,
        // created_by is not in warehouse_serials schema provided, using defaults
      }));

      const { error } = await supabase
        .from("warehouse_serials")
        .upsert(serialsToInsert, {
          onConflict: "warehouse_id,serial_number",
          ignoreDuplicates: true,
        });

      if (error) throw error;

      // Close session
      await supabase
        .from("warehouse_scan_sessions")
        .update({ status: "COMMITTED", committed_at: new Date().toISOString() })
        .eq("id", sessionId);

      return { success: true, count: uniqueValues.length };
    } catch (error) {
      console.error("Commit serials error:", error);
      return { success: false, error };
    }
  }, [scannedItems, warehouseId, clientId, sessionId, productType]);

  // Get identifier values as array (for ledger.unique_identifiers)
  const getIdentifierValues = useCallback(() => {
    return [...new Set(
      scannedItems
        .filter(item => !item.isDuplicate || productType !== "SERIALIZED")
        .map(item => item.value)
    )];
  }, [scannedItems, productType]);

  // Realtime subscription for scan events
  useEffect(() => {
    if (!sessionId) return;

    const subscription = supabase
      .channel(`scan-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "warehouse_scan_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // Only add if not already in local state (prevents duplicates from realtime)
          setScannedItems(prev => {
            const exists = prev.some(item => item.id === payload.new.id);
            if (exists) return prev;
            return [...prev, {
              id: payload.new.id,
              value: payload.new.scanned_value,
              scannedAt: payload.new.created_at,
              isDuplicate: payload.new.is_duplicate,
            }];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "warehouse_scan_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setScannedItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId && isActive) {
        supabase
          .from("warehouse_scan_sessions")
          .update({ status: "ABANDONED" })
          .eq("id", sessionId);
      }
    };
  }, [sessionId, isActive]);

  return {
    // State
    isActive,
    sessionId,
    scannedItems,
    duplicates,
    loading,
    inputValue,
    setInputValue,

    // Stats
    stats: {
      unique: uniqueCount,
      total: totalCount,
      duplicates: duplicateCount,
    },
    calculatedQuantity,

    // Actions
    toggleScanner,
    startSession,
    stopSession,
    processScan,
    handleInputSubmit,
    removeScan,
    clearAll,
    commitIdentifiers,
    getIdentifierValues,
    productType, // Expose productType so UI knows how to render
  };
}
