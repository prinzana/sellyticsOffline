// enterprise/hooks/useEnhancedDispatch.js
// Enhanced Dispatch hook with integrated scanner support
import { useState } from "react";
import { supabase } from "../../../../../supabaseClient";
import { useScannerIntegration } from "./useScannerIntegration";
import toast from "react-hot-toast";

/**
 * ENHANCED DISPATCH HOOK
 * 
 * Adds barcode scanning to dispatch workflow.
 * Scan items to add them to dispatch list.
 * Validates scanned items exist in inventory.
 */
export function useEnhancedDispatch({
    warehouseId,
    clientId,
    inventory = [],
    onSuccess
}) {
    const userEmail = localStorage.getItem("user_email");

    const [dispatchItems, setDispatchItems] = useState([]);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scanMode, setScanMode] = useState(false);
    const [manualIdInput, setManualIdInput] = useState("");

    const availableProducts = inventory.filter(item => item.available_qty > 0);

    // Scanner for looking up products by barcode
    const scanner = useScannerIntegration({
        warehouseId,
        clientId,
        productId: null,
        productType: "STANDARD",
        workflow: "dispatch",
        userId: userEmail,
        preventDuplicates: false,
        onScanComplete: async (scanItem) => {
            await lookupAndAddProduct(scanItem.value);
        },
    });

    // Look up product by barcode/manual ID and add to dispatch
    const handleManualIdLookup = async (value) => {
        const ids = value?.split(",").map(id => id.trim()).filter(Boolean);
        if (!ids || ids.length === 0) return;

        for (const id of ids) {
            await lookupAndAddProduct(id);
        }
        setManualIdInput(""); // Clear after lookup
    };

    // Look up product by barcode and add to dispatch
    const lookupAndAddProduct = async (barcode) => {
        try {
            // First check warehouse_serials
            const { data: serial } = await supabase
                .from("warehouse_serials")
                .select("product_id, serial_number, status, warehouse_products(product_name, product_type)")
                .eq("warehouse_id", warehouseId)
                .eq("serial_number", barcode)
                .eq("status", "IN_STOCK")
                .maybeSingle();

            let productId = serial?.product_id;
            let foundSerial = serial?.serial_number;
            let fetchedProduct = serial?.warehouse_products;

            // Fallback: check product SKU
            if (!productId) {
                const { data: product } = await supabase
                    .from("warehouse_products")
                    .select("id, product_name, product_type")
                    .eq("warehouse_id", warehouseId)
                    .eq("sku", barcode.toUpperCase())
                    .maybeSingle();

                productId = product?.id;
                fetchedProduct = product;
            }

            if (!productId) {
                toast.error(`Invalid or Missing ID: ${barcode}`);
                return;
            }

            // Check if product is in available inventory
            const invItem = availableProducts.find(
                i => i.product?.id === productId || i.warehouse_product_id === productId
            );

            if (!invItem) {
                toast.error("Product not in stock");
                return;
            }

            // Add to dispatch items
            addItem(productId.toString(), invItem, foundSerial);
            toast.success(`Retrieved: ${fetchedProduct?.product_name || invItem.product?.product_name || "Product"}`);
        } catch (error) {
            console.error("Lookup error:", error);
            toast.error("Failed to lookup product");
        }
    };

    // Add item to dispatch list
    const addItem = (productId = "", inventoryItem = null, serialNumber = null) => {
        if (!productId && !inventoryItem) {
            setDispatchItems(prev => [...prev, { productId: "", quantity: 1, scannedSerials: [], productType: "STANDARD" }]);
            return;
        }

        const existingIndex = dispatchItems.findIndex(i => i.productId === productId.toString());
        const existing = dispatchItems[existingIndex];

        // Helper to check if serial already scanned in this item
        const isSerialAlreadyAdded = existing && serialNumber && existing.scannedSerials.includes(serialNumber);

        if (existing) {
            // For SERIALIZED items, prevent adding same serial twice
            if (isSerialAlreadyAdded && (existing.productType === "SERIALIZED" || inventoryItem?.product?.product_type === "SERIALIZED")) {
                toast.error("Serial/ID already added");
                return;
            }

            const maxQty = inventoryItem?.available_qty ||
                availableProducts.find(i => i.product?.id?.toString() === productId.toString())?.available_qty || 1;

            if (existing.quantity < maxQty) {
                // If serial provided, add to list. 
                const newSerials = serialNumber ? [...existing.scannedSerials, serialNumber] : existing.scannedSerials;

                // Update quantity and serials
                setDispatchItems(prev => {
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...existing,
                        quantity: serialNumber ? newSerials.length : existing.quantity + 1,
                        scannedSerials: newSerials
                    };
                    return updated;
                });
                return;
            } else {
                toast.error("Maximum quantity reached");
                return;
            }
        }

        const inv = inventoryItem || availableProducts.find(
            i => i.product?.id?.toString() === productId.toString()
        );

        setDispatchItems(prev => [...prev, {
            productId: productId.toString(),
            quantity: 1,
            maxQuantity: inv?.available_qty || 1,
            productName: inv?.product?.product_name || "Unknown",
            productType: inv?.product?.product_type || "STANDARD",
            inventoryId: inv?.id,
            scannedSerials: serialNumber ? [serialNumber] : [],
        }]);
    };

    // Update item quantity
    const updateItemQuantity = (index, delta) => {
        setDispatchItems(prev => {
            const updated = [...prev];
            const item = updated[index];
            const newQty = Math.max(1, Math.min(item.maxQuantity || 999, item.quantity + delta));
            updated[index] = { ...item, quantity: newQty };
            return updated;
        });
    };

    // Update item product selection
    const updateItemProduct = (index, productId) => {
        const inv = availableProducts.find(i => i.product?.id?.toString() === productId);
        setDispatchItems(prev => {
            const updated = [...prev];
            updated[index] = {
                productId,
                quantity: 1,
                maxQuantity: inv?.available_qty || 1,
                productName: inv?.product?.product_name || "Unknown",
                productType: inv?.product?.product_type || "STANDARD",
                inventoryId: inv?.id,
                scannedSerials: [], // Reset serials if product changes
            };
            return updated;
        });
    };

    // Remove item
    const removeItem = (index) => {
        setDispatchItems(prev => prev.filter((_, i) => i !== index));
    };

    // Get product info helper
    const getProductInfo = (productId) => {
        const inv = availableProducts.find(i => i.product?.id?.toString() === productId);
        return {
            name: inv?.product?.product_name || "Unknown",
            available: inv?.available_qty || 0,
            productType: inv?.product?.product_type || "STANDARD",
            inventoryId: inv?.id,
        };
    };

    // Submit dispatch
    const handleDispatch = async () => {
        if (dispatchItems.length === 0) {
            toast.error("Add items to dispatch");
            return;
        }

        // Validate all items
        for (const item of dispatchItems) {
            const { available, name } = getProductInfo(item.productId);
            if (!item.productId) {
                toast.error("Select a product for all items");
                return;
            }
            if (item.quantity > available) {
                toast.error(`Insufficient stock for ${name}`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            for (const item of dispatchItems) {
                const { inventoryId } = getProductInfo(item.productId);

                // Prepare identifiers for ledger (Must match quantity strictly due to DB constraint)
                let ledgerIdentifiers = null;
                if (item.productType === "SERIALIZED" && item.scannedSerials.length === item.quantity) {
                    ledgerIdentifiers = item.scannedSerials;
                }
                // For BATCH, we do NOT send unique_identifiers because Qty (e.g. 10) != ScannedCount (1)
                // and the DB constraint chk_serial_qty_match forbids mismatch.

                // Create ledger entry
                const { data: ledgerEntry, error: ledgerError } = await supabase
                    .from("warehouse_ledger")
                    .insert({
                        warehouse_id: warehouseId,
                        warehouse_product_id: parseInt(item.productId),
                        client_id: clientId,
                        movement_type: "OUT",
                        movement_subtype: "DISPATCH",
                        quantity: item.quantity,
                        notes: notes || "Dispatched",
                        created_by: userEmail,
                        unique_identifiers: ledgerIdentifiers
                    })
                    .select("id")
                    .single();

                if (ledgerError) throw ledgerError;

                // Update inventory
                const { data: currentInv } = await supabase
                    .from("warehouse_inventory")
                    .select("quantity, available_qty")
                    .eq("id", inventoryId || item.inventoryId)
                    .single();

                if (currentInv) {
                    await supabase
                        .from("warehouse_inventory")
                        .update({
                            quantity: currentInv.quantity - item.quantity,
                            available_qty: currentInv.available_qty - item.quantity
                        })
                        .eq("id", inventoryId || item.inventoryId);
                }

                // If SERIALIZED and we have scanned serials, mark them as DISPATCHED
                if (item.productType === "SERIALIZED" && item.scannedSerials.length > 0) {
                    await supabase
                        .from("warehouse_serials")
                        .update({
                            status: "DISPATCHED",
                            last_ledger_id: ledgerEntry.id
                        })
                        .in("serial_number", item.scannedSerials)
                        .eq("warehouse_id", warehouseId)
                        .eq("product_id", parseInt(item.productId));
                }
            }

            const totalQty = dispatchItems.reduce((sum, i) => sum + i.quantity, 0);
            toast.success(`Successfully dispatched ${totalQty} items`);

            // Reset
            setDispatchItems([]);
            setNotes("");
            if (scanner.isActive) {
                scanner.stopSession();
            }

            onSuccess?.();
        } catch (error) {
            console.error(error);
            toast.error("Dispatch failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalItems = dispatchItems.reduce((sum, i) => sum + i.quantity, 0);

    return {
        // State
        dispatchItems,
        notes,
        setNotes,
        isSubmitting,
        scanMode,
        setScanMode,
        availableProducts,
        totalItems,
        manualIdInput,
        setManualIdInput,

        // Scanner
        scanner,

        // Actions
        addItem,
        updateItemQuantity,
        updateItemProduct,
        removeItem,
        getProductInfo,
        handleDispatch,
        lookupAndAddProduct,
        handleManualIdLookup,
    };
}
