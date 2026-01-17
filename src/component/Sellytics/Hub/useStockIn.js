// useStockIn.js - unit_cost now inserted into warehouse_inventory
import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import toast from "react-hot-toast";

export function useStockIn({ warehouseId, clientId, products, onSuccess }) {
  const userEmail = localStorage.getItem("user_email");

  if (!userEmail) {
    console.error("user_email missing from localStorage");
  }

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [manualSerials, setManualSerials] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [scannerActive, setScannerActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [scanStats, setScanStats] = useState({ total: 0, unique: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find(
    (p) => p.id === Number(selectedProductId)
  );

  // Helper to parse manual serials
  const getManualSerialsArray = useCallback(() => {
    if (!manualSerials) return [];
    return manualSerials
      .split(/[,;\s\n]+/)
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }, [manualSerials]);

  const startScanSession = async () => {
    if (!userEmail) {
      toast.error("User email not found. Cannot start scan session.");
      return;
    }

    const { data, error } = await supabase
      .from("warehouse_scan_sessions")
      .insert({
        warehouse_id: warehouseId,
        client_id: clientId,
        created_by: userEmail,
        status: "ACTIVE",
        session_type: "STOCK_IN",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Scan session error:", error);
      toast.error("Failed to start scan session");
      return;
    }

    setSessionId(data.id);
    setScannerActive(true);
    toast.success("Scanner activated");
  };

  const handleScanUpdate = useCallback(
    (stats) => {
      setScanStats(stats);
    },
    []
  );

  useEffect(() => {
    if (selectedProduct?.product_type === "SERIALIZED") {
      const manualCount = getManualSerialsArray().length;
      setQuantity(scanStats.unique + manualCount);
    } else if (selectedProduct?.product_type === "BATCH" && scannerActive) {
      setQuantity(scanStats.total);
    }
  }, [scanStats, manualSerials, selectedProduct?.product_type, scannerActive, getManualSerialsArray]);

  const handleSubmit = async () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const currentQty = selectedProduct?.product_type === "SERIALIZED"
      ? (scanStats.unique + getManualSerialsArray().length)
      : quantity;

    if (currentQty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (!userEmail) {
      toast.error("User email missing. Cannot complete stock-in.");
      return;
    }

    setIsSubmitting(true);

    try {
      let uniqueIdentifiers = [];

      // 1. Get Scanned IDs
      if (sessionId) {
        const { data: scans, error: scanFetchError } = await supabase
          .from("warehouse_scan_events")
          .select("scanned_value")
          .eq("session_id", sessionId);

        if (!scanFetchError && scans?.length) {
          uniqueIdentifiers = scans.map((s) => s.scanned_value);
        }
      }

      // 2. Merge with Manual IDs
      const manualArray = getManualSerialsArray();
      uniqueIdentifiers = [...uniqueIdentifiers, ...manualArray];

      let finalQty = quantity;
      let skippedCount = 0;

      if (selectedProduct?.product_type === "SERIALIZED") {
        uniqueIdentifiers = [...new Set(uniqueIdentifiers.map(s => s.trim()))].filter(s => s);

        // Global Check for Partial Success
        if (uniqueIdentifiers.length > 0) {
          const { data: existingSerials, error: syncError } = await supabase
            .from("warehouse_serials")
            .select("serial_number")
            .in("serial_number", uniqueIdentifiers);

          if (syncError) throw syncError;

          if (existingSerials?.length > 0) {
            const existingValues = existingSerials.map(s => s.serial_number);
            uniqueIdentifiers = uniqueIdentifiers.filter(sn => !existingValues.includes(sn));
            skippedCount = existingValues.length;

            if (uniqueIdentifiers.length === 0) {
              toast.error(`All ${skippedCount} IDs already exist in the system.`, {
                style: { border: '1px solid #ef4444', padding: '16px', color: '#b91c1c' }
              });
              setIsSubmitting(false);
              return;
            }
          }
        }
        finalQty = uniqueIdentifiers.length;
      }

      if (finalQty < 1) {
        toast.error("Valid quantity must be at least 1.");
        setIsSubmitting(false);
        return;
      }

      // Ledger insert
      const { error: ledgerError } = await supabase
        .from("warehouse_ledger")
        .insert({
          warehouse_id: warehouseId,
          warehouse_product_id: Number(selectedProductId),
          client_id: clientId,
          movement_type: "IN",
          movement_subtype: "STOCK_IN",
          quantity: finalQty,
          unique_identifiers: uniqueIdentifiers.length > 0 ? uniqueIdentifiers : null,
          notes: `${skippedCount > 0 ? `(${skippedCount} duplicates skipped) ` : ""}${notes || "Stock received"}`,
          item_condition: condition,
          created_by: userEmail,
        })
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      // Inventory check
      const { data: existingInv, error: fetchError } = await supabase
        .from("warehouse_inventory")
        .select("id, quantity, available_qty, damaged_qty, unit_cost")
        .eq("warehouse_id", warehouseId)
        .eq("warehouse_product_id", Number(selectedProductId))
        .eq("client_id", clientId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      const parsedUnitCost = unitCost === "" ? null : parseFloat(unitCost);

      if (existingInv) {
        const updates = {
          quantity: existingInv.quantity + finalQty,
        };

        if (condition === "GOOD") {
          updates.available_qty = existingInv.available_qty + finalQty;
        }

        if (condition === "DAMAGED") {
          updates.damaged_qty = (existingInv.damaged_qty || 0) + finalQty;
        }

        if (parsedUnitCost !== null) {
          updates.unit_cost = parsedUnitCost;
        }

        const { error: updateError } = await supabase
          .from("warehouse_inventory")
          .update(updates)
          .eq("id", existingInv.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("warehouse_inventory")
          .insert({
            warehouse_id: warehouseId,
            warehouse_product_id: Number(selectedProductId),
            client_id: clientId,
            quantity: finalQty,
            available_qty: condition === "GOOD" ? finalQty : 0,
            damaged_qty: condition === "DAMAGED" ? finalQty : 0,
            unit_cost: parsedUnitCost,
          });

        if (insertError) throw insertError;
      }

      if (sessionId) {
        await supabase
          .from("warehouse_scan_sessions")
          .update({ status: "COMMITTED" })
          .eq("id", sessionId);
      }

      // Persist serials
      if (uniqueIdentifiers.length > 0 && selectedProduct?.product_type === "SERIALIZED") {
        const serialsToInsert = uniqueIdentifiers.map(serial => ({
          warehouse_id: warehouseId,
          product_id: Number(selectedProductId),
          client_id: clientId,
          serial_number: serial,
          status: "IN_STOCK",
        }));

        const { error: serialError } = await supabase
          .from("warehouse_serials")
          .upsert(serialsToInsert, {
            onConflict: "warehouse_id,serial_number",
            ignoreDuplicates: true,
          });

        if (serialError) {
          console.warn("Serial insert warning:", serialError.message);
        }
      }

      toast.success(
        `Successfully stocked in ${finalQty} unit${finalQty > 1 ? "s" : ""}${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ""}`
      );

      // Reset
      setSelectedProductId("");
      setQuantity(1);
      setUnitCost("");
      setNotes("");
      setCondition("GOOD");
      setScannerActive(false);
      setSessionId(null);
      setScanStats({ total: 0, unique: 0 });
      setManualSerials(""); // Reset manual serials

      onSuccess?.();
    } catch (error) {
      console.error("Stock-in error:", error);
      toast.error("Failed to stock in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedProductId,
    setSelectedProductId,
    quantity,
    setQuantity,
    unitCost,
    setUnitCost,
    notes,
    setNotes,
    condition,
    setCondition,
    scannerActive,
    setScannerActive,
    sessionId,
    scanStats,
    manualSerials,
    setManualSerials,
    isSubmitting,
    selectedProduct,
    startScanSession,
    handleScanUpdate,
    handleSubmit,
  };
}
