import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

export function useProductSerials({ product, isOpen, onClose }) {
    const [serials, setSerials] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [page, setPage] = useState(1);

    const [totalCount, setTotalCount] = useState(0);
    const [damagedCount, setDamagedCount] = useState(0);
    const [dispatchedCount, setDispatchedCount] = useState(0);
    const [historyCount, setHistoryCount] = useState(0);

    const pageSize = 10;

    const [supabase] = useState(
        () => require("../../../../supabaseClient").supabase
    );

    /* ---------------------------------------------------- */
    /* Load Inventory / Serials / History                   */
    /* ---------------------------------------------------- */
    const loadInventoryData = useCallback(
        async (pageNum = 1) => {
            if (!product?.id) return;

            setLoading(true);

            const from = (pageNum - 1) * pageSize;
            const to = from + pageSize - 1;

            try {
                // 1️⃣ Inventory stats
                const { data: inv } = await supabase
                    .from("warehouse_inventory")
                    .select("available_qty, damaged_qty")
                    .eq("warehouse_product_id", product.id)
                    .maybeSingle();

                // 2️⃣ Dispatched count
                const { data: ledgerDispatched } = await supabase
                    .from("warehouse_ledger")
                    .select("quantity")
                    .eq("warehouse_product_id", product.id)
                    .eq("movement_subtype", "DISPATCH");

                const totalDisp = (ledgerDispatched || []).reduce(
                    (sum, i) => sum + (i.quantity || 0),
                    0
                );

                setTotalCount(inv?.available_qty || 0);
                setDamagedCount(inv?.damaged_qty || 0);
                setDispatchedCount(totalDisp);

                // 3️⃣ Serialized vs Non-Serialized
                if (product.product_type === "SERIALIZED") {
                    const { data } = await supabase
                        .from("warehouse_serials")
                        .select("*")
                        .eq("product_id", product.id)
                        .order("status", { ascending: true })
                        .order("created_at", { ascending: false })
                        .range(from, to);

                    setSerials(data || []);
                    setHistory([]);
                    setHistoryCount(0);
                } else {
                    const { data, count } = await supabase
                        .from("warehouse_ledger")
                        .select("*", { count: "exact" })
                        .eq("warehouse_product_id", product.id)
                        .order("created_at", { ascending: false })
                        .range(from, to);

                    setHistory(data || []);
                    setHistoryCount(count || 0);
                    setSerials([]);
                }
            } finally {
                setLoading(false);
            }
        },
        [product?.id, product?.product_type, pageSize, supabase]
    );

    /* ---------------------------------------------------- */
    /* Open Modal → Load Data                               */
    /* ---------------------------------------------------- */
    useEffect(() => {
        if (isOpen && product?.id) {
            setPage(1);
            loadInventoryData(1);
        }
    }, [isOpen, product?.id, loadInventoryData]);

    /* ---------------------------------------------------- */
    /* Delete Single Serial                                 */
    /* ---------------------------------------------------- */
    const handleDeleteSerial = useCallback(
        async (serial) => {
            if (!window.confirm(`Remove "${serial.serial_number}"?`)) return;

            setDeletingId(serial.id);

            try {
                await supabase
                    .from("warehouse_serials")
                    .delete()
                    .eq("id", serial.id);

                const { data: inv } = await supabase
                    .from("warehouse_inventory")
                    .select("*")
                    .eq("warehouse_product_id", product.id)
                    .single();

                if (inv) {
                    const updates = { quantity: Math.max(0, inv.quantity - 1) };

                    if (serial.status === "IN_STOCK" || serial.status === "GOOD") {
                        updates.available_qty = Math.max(0, inv.available_qty - 1);
                    } else if (serial.status === "DAMAGED") {
                        updates.damaged_qty = Math.max(0, (inv.damaged_qty || 0) - 1);
                    }

                    await supabase
                        .from("warehouse_inventory")
                        .update(updates)
                        .eq("id", inv.id);
                }

                toast.success("Serial removed");
                loadInventoryData(page);
            } catch {
                toast.error("Delete failed");
            } finally {
                setDeletingId(null);
            }
        },
        [product?.id, supabase, loadInventoryData, page]
    );

    /* ---------------------------------------------------- */
    /* Clear All Serials                                    */
    /* ---------------------------------------------------- */
    const handleClearAll = useCallback(
        async () => {
            if (!window.confirm("CRITICAL: Remove ALL serials?")) return;

            setLoading(true);

            try {
                await supabase
                    .from("warehouse_serials")
                    .delete()
                    .eq("product_id", product.id);

                await supabase
                    .from("warehouse_inventory")
                    .update({ quantity: 0, available_qty: 0, damaged_qty: 0 })
                    .eq("warehouse_product_id", product.id);

                toast.success("Inventory reset");
                onClose();
            } finally {
                setLoading(false);
            }
        },
        [product?.id, supabase, onClose]
    );

    /* ---------------------------------------------------- */
    /* Clear Movement History                               */
    /* ---------------------------------------------------- */
    const handleClearHistory = useCallback(
        async () => {
            if (
                !window.confirm(
                    "CRITICAL: Clear ALL movement history? Inventory will reset."
                )
            )
                return;

            setLoading(true);

            try {
                await supabase
                    .from("warehouse_ledger")
                    .delete()
                    .eq("warehouse_product_id", product.id);

                await supabase
                    .from("warehouse_inventory")
                    .update({ quantity: 0, available_qty: 0, damaged_qty: 0 })
                    .eq("warehouse_product_id", product.id);

                toast.success("History and inventory reset");
                onClose();
            } catch (err) {
                console.error(err);
                toast.error("Failed to clear history");
            } finally {
                setLoading(false);
            }
        },
        [product?.id, supabase, onClose]
    );

    return {
        serials,
        history,
        loading,
        deletingId,
        page,
        setPage,
        totalCount,
        damagedCount,
        dispatchedCount,
        historyCount,
        pageSize,
        loadSerials: loadInventoryData,
        handleDeleteSerial,
        handleClearAll,
        handleClearHistory,
    };
}
