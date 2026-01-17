// enterprise/hooks/useEnhancedStockIn.js
// Enhanced Stock-In hook with integrated scanner support
// Wraps existing useStockIn with scanner integration

import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../../../supabaseClient";
import { useScannerIntegration } from "./useScannerIntegration";
import toast from "react-hot-toast";

/**
 * ENHANCED STOCK-IN HOOK
 * 
 * Combines existing stock-in functionality with unified scanner integration.
 * Automatically calculates quantity from scanned barcodes for SERIALIZED products.
 * Persists identifiers after successful stock-in.
 */
export function useEnhancedStockIn({
    warehouseId,
    clientId,
    products,
    onSuccess
}) {
    const userEmail = localStorage.getItem("user_email");

    const [selectedProductId, setSelectedProductId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState("");
    const [notes, setNotes] = useState("");
    const [condition, setCondition] = useState("GOOD");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedProduct = products.find(
        (p) => p.id === Number(selectedProductId)
    );

    // Initialize scanner integration
    const scanner = useScannerIntegration({
        warehouseId,
        clientId,
        productId: selectedProduct?.id || null,
        productType: selectedProduct?.product_type || "STANDARD",
        workflow: "stock_in",
        userId: userEmail,
        preventDuplicates: selectedProduct?.product_type === "SERIALIZED",
        onScanComplete: (item, count) => {
            // Auto-update quantity for serialized products
            if (selectedProduct?.product_type === "SERIALIZED") {
                setQuantity(scanner.stats.unique + 1);
            } else if (selectedProduct?.product_type === "BATCH") {
                setQuantity(scanner.stats.total + 1);
            }
        },
    });

    // Sync quantity with scanner stats when product type is SERIALIZED or BATCH
    useEffect(() => {
        if (scanner.isActive && selectedProduct) {
            if (selectedProduct.product_type === "SERIALIZED") {
                setQuantity(scanner.stats.unique || 1);
            } else if (selectedProduct.product_type === "BATCH") {
                setQuantity(scanner.stats.total || 1);
            }
        }
    }, [scanner.stats, scanner.isActive, selectedProduct]);

    // Reset scanner when product changes
    useEffect(() => {
        if (scanner.isActive && scanner.scannedItems.length > 0) {
            scanner.clearAll();
        }
    }, [selectedProductId]);

    const handleSubmit = async () => {
        if (!selectedProductId) {
            toast.error("Please select a product");
            return;
        }

        if (quantity < 1) {
            toast.error("Quantity must be at least 1");
            return;
        }

        if (!userEmail) {
            toast.error("User email missing. Cannot complete stock-in.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Get unique identifiers from scanner (if active)
            let uniqueIdentifiers = null;
            if (scanner.isActive && scanner.scannedItems.length > 0) {
                uniqueIdentifiers = scanner.getIdentifierValues();
            }

            // Create ledger entry
            const { data: ledgerEntry, error: ledgerError } = await supabase
                .from("warehouse_ledger")
                .insert({
                    warehouse_id: warehouseId,
                    warehouse_product_id: Number(selectedProductId),
                    client_id: clientId,
                    movement_type: "IN",
                    movement_subtype: "STOCK_IN",
                    quantity,
                    unique_identifiers: uniqueIdentifiers,
                    notes: notes || "Stock received",
                    item_condition: condition,
                    created_by: userEmail,
                })
                .select("id")
                .single();

            if (ledgerError) throw ledgerError;

            // Update inventory
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
                    quantity: existingInv.quantity + quantity,
                };

                if (condition === "GOOD") {
                    updates.available_qty = existingInv.available_qty + quantity;
                }

                if (condition === "DAMAGED") {
                    updates.damaged_qty = (existingInv.damaged_qty || 0) + quantity;
                }

                if (parsedUnitCost !== null) {
                    updates.unit_cost = parsedUnitCost;
                }

                const { error } = await supabase
                    .from("warehouse_inventory")
                    .update(updates)
                    .eq("id", existingInv.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("warehouse_inventory")
                    .insert({
                        warehouse_id: warehouseId,
                        warehouse_product_id: Number(selectedProductId),
                        client_id: clientId,
                        quantity,
                        available_qty: condition === "GOOD" ? quantity : 0,
                        damaged_qty: condition === "DAMAGED" ? quantity : 0,
                        unit_cost: parsedUnitCost,
                    });

                if (error) throw error;
            }

            // ENTERPRISE: Commit identifiers to persistent storage
            if (scanner.isActive && scanner.scannedItems.length > 0) {
                const commitResult = await scanner.commitIdentifiers(
                    Number(selectedProductId),
                    ledgerEntry?.id
                );

                if (commitResult.success && commitResult.count > 0) {
                    console.log(`Committed ${commitResult.count} identifiers`);
                }
            }

            // Close scan session if active
            if (scanner.sessionId) {
                await scanner.stopSession();
            }

            toast.success(
                `Successfully stocked in ${quantity} unit${quantity > 1 ? "s" : ""}`
            );

            // Reset form
            setSelectedProductId("");
            setQuantity(1);
            setUnitCost("");
            setNotes("");
            setCondition("GOOD");

            onSuccess?.();
        } catch (error) {
            console.error("Stock-in error:", error);
            toast.error("Failed to stock in");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        // Form state
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
        isSubmitting,
        selectedProduct,

        // Scanner integration
        scanner,
        scannerActive: scanner.isActive,
        scanStats: scanner.stats,

        // Actions
        handleSubmit,
        startScanner: scanner.startSession,
        stopScanner: scanner.stopSession,
        toggleScanner: scanner.toggleScanner,
    };
}
