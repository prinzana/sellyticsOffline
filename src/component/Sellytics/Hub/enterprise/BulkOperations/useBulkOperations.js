// enterprise/BulkOperations/useBulkOperations.js
// Hook for bulk product operations
import { useState, useCallback } from "react";
import { supabase } from "../../../../../supabaseClient";
import toast from "react-hot-toast";

/**
 * BULK OPERATIONS HOOK
 * 
 * Supports:
 * - Bulk delete products
 * - Bulk update prices
 * - Bulk export to CSV
 */
export function useBulkOperations({ warehouseId, clientId, onRefresh }) {
    const userEmail = localStorage.getItem("user_email");

    const [selectedIds, setSelectedIds] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Toggle single item selection
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    }, []);

    // Select all items
    const selectAll = useCallback((items) => {
        setSelectedIds(items.map(i => i.id));
    }, []);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    // Check if item is selected
    const isSelected = useCallback((id) => {
        return selectedIds.includes(id);
    }, [selectedIds]);

    // Bulk delete products
    const bulkDelete = async (productIds) => {
        if (productIds.length === 0) return { success: false };

        setIsProcessing(true);
        const results = { success: 0, failed: 0, details: [] };

        try {
            for (const productId of productIds) {
                try {
                    // Delete inventory records first (FK safety)
                    await supabase
                        .from("warehouse_inventory")
                        .delete()
                        .eq("warehouse_product_id", productId)
                        .eq("client_id", clientId);

                    // Delete associated serials
                    await supabase
                        .from("warehouse_serials")
                        .delete()
                        .eq("product_id", productId);

                    // Delete the product
                    const { error } = await supabase
                        .from("warehouse_products")
                        .delete()
                        .eq("id", productId)
                        .eq("warehouse_client_id", clientId);

                    if (error) throw error;

                    // Audit log
                    await supabase.from("warehouse_audit_logs").insert({
                        warehouse_id: warehouseId,
                        user_id: userEmail,
                        action: "BULK_DELETE",
                        entity_type: "product",
                        entity_id: productId.toString(),
                        details: { deleted_by: userEmail },
                    });

                    results.success++;
                    results.details.push({ productId, status: "deleted" });
                } catch (err) {
                    console.error(`Failed to delete product ${productId}:`, err);
                    results.failed++;
                    results.details.push({ productId, status: "failed", error: err.message });
                }
            }

            if (results.success > 0) {
                toast.success(`Deleted ${results.success} products`);
                clearSelection();
                onRefresh?.();
            }

            if (results.failed > 0) {
                toast.error(`Failed to delete ${results.failed} products`);
            }

            return { success: true, results };
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast.error("Bulk delete failed");
            return { success: false, error };
        } finally {
            setIsProcessing(false);
            setShowDeleteModal(false);
        }
    };

    // Bulk update prices
    const bulkUpdatePrice = async (productIds, priceChange) => {
        if (productIds.length === 0) return { success: false };

        setIsProcessing(true);

        try {
            for (const productId of productIds) {
                if (priceChange.type === "set") {
                    await supabase
                        .from("warehouse_products")
                        .update({ unit_cost: priceChange.value })
                        .eq("id", productId);
                } else if (priceChange.type === "increase") {
                    const { data: product } = await supabase
                        .from("warehouse_products")
                        .select("unit_cost")
                        .eq("id", productId)
                        .single();

                    if (product) {
                        const newPrice = (product.unit_cost || 0) + priceChange.value;
                        await supabase
                            .from("warehouse_products")
                            .update({ unit_cost: newPrice })
                            .eq("id", productId);
                    }
                } else if (priceChange.type === "percentage") {
                    const { data: product } = await supabase
                        .from("warehouse_products")
                        .select("unit_cost")
                        .eq("id", productId)
                        .single();

                    if (product) {
                        const newPrice = (product.unit_cost || 0) * (1 + priceChange.value / 100);
                        await supabase
                            .from("warehouse_products")
                            .update({ unit_cost: newPrice })
                            .eq("id", productId);
                    }
                }
            }

            toast.success(`Updated prices for ${productIds.length} products`);
            clearSelection();
            onRefresh?.();

            return { success: true };
        } catch (error) {
            console.error("Bulk update error:", error);
            toast.error("Failed to update prices");
            return { success: false, error };
        } finally {
            setIsProcessing(false);
        }
    };

    // Export to CSV
    const exportToCsv = async (products) => {
        try {
            const headers = ["Product Name", "SKU", "Type", "Unit Cost", "Quantity", "Available", "Damaged"];
            const rows = products.map(p => [
                p.product_name || p.name,
                p.sku || "",
                p.product_type || "",
                p.unit_cost || 0,
                p.quantity || 0,
                p.available_qty || 0,
                p.damaged_qty || 0,
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `products_export_${new Date().toISOString().split("T")[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success("Export complete");
            return { success: true };
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Export failed");
            return { success: false, error };
        }
    };

    return {
        selectedIds,
        selectedCount: selectedIds.length,
        isProcessing,
        showDeleteModal,
        setShowDeleteModal,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
        bulkDelete,
        bulkUpdatePrice,
        exportToCsv,
    };
}
