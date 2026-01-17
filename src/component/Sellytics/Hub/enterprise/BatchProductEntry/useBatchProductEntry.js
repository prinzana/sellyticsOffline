// enterprise/BatchProductEntry/useBatchProductEntry.js
// Hook for batch product creation with scanner integration
import { useState, useEffect } from "react";
import { supabase } from "../../../../../supabaseClient";
import { useScannerIntegration } from "../hooks/useScannerIntegration";
import { useCollaboration } from "../Collaboration/useCollaboration";
import toast from "react-hot-toast";

export function useBatchProductEntry({ warehouseId, clientId, onSuccess }) {
    const userEmail = localStorage.getItem("user_email");

    // Import hooks AT THE TOP
    const { broadcast, activeSession } = useCollaboration({ warehouseId, clientId });

    // State definitions
    const [productName, setProductName] = useState("");
    const [sku, setSku] = useState("");
    const [productType, setProductType] = useState("SERIALIZED");
    const [unitCost, setUnitCost] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Scanner Hook
    const scanner = useScannerIntegration({
        warehouseId,
        clientId,
        productId: null,
        productType,
        workflow: "create",
        userId: userEmail,
        preventDuplicates: productType === "SERIALIZED",
        onScanComplete: (item, count) => {
            if (activeSession) broadcast('scan', { item: item.value });
            if (productType === "BATCH") setQuantity(prev => Math.max(prev, count));
        }
    });

    // Local fallback and Drafts state
    const [localProducts, setLocalProducts] = useState([]);
    const [draftProducts, setDraftProducts] = useState([]);

    // Choose source of truth
    const productsList = activeSession ? draftProducts : localProducts;

    // REALTIME: Fetch & Subscribe to Drafts
    useEffect(() => {
        if (!activeSession) return;

        // 1. Fetch Initial
        const fetchDrafts = async () => {
            const { data } = await supabase
                .from("warehouse_session_draft_items")
                .select("*")
                .eq("session_id", activeSession.id)
                .order("created_at", { ascending: false });
            if (data) setDraftProducts(data);
        };
        fetchDrafts();

        // 2. Subscribe
        const channel = supabase
            .channel(`drafts-${activeSession.id}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "warehouse_session_draft_items",
                filter: `session_id=eq.${activeSession.id}`
            }, (payload) => {
                if (payload.eventType === "INSERT") setDraftProducts(prev => [payload.new, ...prev]);
                if (payload.eventType === "DELETE") setDraftProducts(prev => prev.filter(i => i.id !== payload.old.id));
                if (payload.eventType === "UPDATE") setDraftProducts(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
            })
            .subscribe();



        return () => supabase.removeChannel(channel);
    }, [activeSession]);

    // Add current form to queue (Local or Remote)
    const addToQueue = async () => {
        if (!productName.trim()) {
            toast.error("Product name is required");
            return;
        }

        const finalQuantity = productType === "SERIALIZED" ? scanner.calculatedQuantity : quantity;

        // ... (validation logic same as before) ...
        if (finalQuantity < 1) { toast.error("Quantity must be >= 1"); return; }
        if (productType !== "STANDARD" && scanner.scannedItems.length === 0) { toast.error("Scan required"); return; }

        const newItem = {
            product_name: productName.trim(),
            sku: sku.trim() ? sku.trim().toUpperCase() : null,
            product_type: productType,
            unit_cost: unitCost === "" ? null : parseFloat(unitCost),
            quantity: finalQuantity,
            status: "draft",

            // Scanner meta
            scanned_value: scanner.scannedItems[0]?.value || null,
            scanned_data: scanner.scannedItems,
            unique_count: scanner.stats.unique,
            created_by: userEmail,
        };

        if (activeSession) {
            // REMOTE: Insert to DB
            const { error } = await supabase.from("warehouse_session_draft_items").insert({
                ...newItem,
                session_id: activeSession.id
            });

            if (error) {
                toast.error("Failed to sync draft");
                console.error(error);
                return;
            }

            // Broadcast 'scan' action (visual only, redundant but nice for activity feed)
            broadcast('scan', { item: newItem.product_name });
            toast.success("Draft synced to session ☁️");
        } else {
            // LOCAL: Fallback
            setLocalProducts(prev => [...prev, { ...newItem, id: Date.now(), scannedItems: scanner.scannedItems }]);
            toast.success("Added to local list");
        }

        // Reset Form
        setProductName("");
        setSku("");
        setProductType("SERIALIZED");
        setUnitCost("");
        setQuantity(1);
        await scanner.startSession();
    };

    const removeProduct = async (indexOrId) => {
        if (activeSession) {
            // Remove from DB (using ID)
            const item = productsList[indexOrId]; // index logic might need adjustment if passing ID directly
            // Ideally UI passes ID. Assuming index for backward compat:
            const idToDelete = item?.id;
            if (idToDelete) await supabase.from("warehouse_session_draft_items").delete().eq("id", idToDelete);
        } else {
            setLocalProducts(prev => prev.filter((_, i) => i !== indexOrId));
        }
    };

    // ... handleSubmitAll needs to read from productsList (which is abstracted above)
    // ... logic remains mostly same, just looping over `productsList`

    const handleSubmitAll = async () => {
        if (productsList.length === 0) {
            toast.error("No products in list");
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;

        try {
            for (const item of productsList) {
                // Item mapping: Database Drafts have snake_case keys, Local items might have camelCase
                // Normalize:
                const pName = item.product_name || item.name;
                const pSku = item.sku;
                const pType = item.product_type || item.type;
                const pQty = item.quantity;
                const pCost = item.unit_cost || item.unitCost;
                const pScannedItems = item.scanned_data || item.scannedItems || [];
                const pUniqueCount = item.unique_count || item.uniqueCount || 0;

                // Create product
                const { data: product, error: productError } = await supabase
                    .from("warehouse_products")
                    .insert({
                        warehouse_id: warehouseId,
                        warehouse_client_id: clientId,
                        product_name: pName,
                        sku: pSku,
                        product_type: pType,
                        unit_cost: pCost,
                        identifier_count: pType !== "STANDARD" ? pUniqueCount : 0,
                        created_by: userEmail,
                    })
                    .select("id")
                    .single();

                if (productError) {
                    console.error("Create failed", productError);
                    toast.error(`Failed: ${pName}`);
                    continue;
                }

                // Inventory
                await supabase.from("warehouse_inventory").insert({
                    warehouse_id: warehouseId, warehouse_product_id: product.id, client_id: clientId,
                    quantity: pQty, available_qty: pQty, damaged_qty: 0, unit_cost: pCost
                });

                // Ledger
                const uniqueValues = [...new Set(pScannedItems.map(s => s.value))];

                // Ledger Logic (Same as previous step's fix)
                const { data: ledgerEntry } = await supabase.from("warehouse_ledger").insert({
                    warehouse_id: warehouseId, warehouse_product_id: product.id,
                    client_id: clientId, movement_type: "IN", movement_subtype: "INITIAL_STOCK",
                    quantity: pQty,
                    unique_identifiers: (pType === "SERIALIZED" && uniqueValues.length === pQty) ? uniqueValues : null,
                    notes: "Initial stock via Batch Entry", created_by: userEmail
                }).select("id").single();

                // Serials
                if (pType !== "STANDARD" && uniqueValues.length > 0) {
                    const serialsToInsert = uniqueValues.map(value => ({
                        warehouse_id: warehouseId, product_id: product.id, client_id: clientId,
                        serial_number: value, status: "IN_STOCK", last_ledger_id: ledgerEntry?.id
                    }));
                    await supabase.from("warehouse_serials").upsert(serialsToInsert, { onConflict: "warehouse_id,serial_number", ignoreDuplicates: true });
                }

                // IF REMOTE: Delete draft after success
                if (activeSession && item.id) {
                    await supabase.from("warehouse_session_draft_items").delete().eq("id", item.id);
                }

                successCount++;
            }

            if (successCount > 0) {
                toast.success(`Successfully committed ${successCount} products`);
                if (!activeSession) setLocalProducts([]);
                // Drafts clear automatically via Realtime DELETE listener
                onSuccess?.();
            }

        } catch (error) {
            console.error("Submit error:", error);
            toast.error("Error submitting batch");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Return exposed methods
    return {
        productName, setProductName,
        sku, setSku,
        productType, setProductType,
        unitCost, setUnitCost,
        quantity, setQuantity,
        isSubmitting,
        scanner,

        productsList, // This is now live!
        addToQueue,
        removeProduct,
        handleSubmitAll
    };
}
