import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Search, Loader2, Tag, CheckCircle2, Truck, AlertCircle, TrendingUp, TrendingDown, Clock } from "lucide-react";

export default function InventoryDetailsModal({ isOpen, onClose, inventoryItem, fetchSerials, fetchHistory }) {
    const [serials, setSerials] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const isSerialized = inventoryItem?.product?.product_type === 'SERIALIZED' || inventoryItem?.product_type === 'SERIALIZED';
    const productId = inventoryItem?.warehouse_product_id || inventoryItem?.product_id;

    const loadData = useCallback(async () => {
        if (!productId) return;
        setLoading(true);
        try {
            if (isSerialized) {
                const data = await fetchSerials(productId);
                setSerials(data || []);
            } else if (fetchHistory) {
                const data = await fetchHistory(productId);
                setHistory(data || []);
            }
        } catch (error) {
            console.error("Error loading inventory details:", error);
        } finally {
            setLoading(false);
        }
    }, [productId, isSerialized, fetchSerials, fetchHistory]);

    useEffect(() => {
        if (isOpen && productId) {
            loadData();
        } else if (!isOpen) {
            setSerials([]);
            setHistory([]);
            setLoading(false);
            setSearchQuery("");
        }
    }, [isOpen, productId, loadData]);

    const filteredSerials = serials.filter(s =>
        s.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredHistory = history.filter(h =>
        (h.notes?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.movement_subtype?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!inventoryItem) return null;

    // Use quantities from the inventory item directly for accuracy
    const availableQty = inventoryItem.available_qty || 0;
    const damagedQty = inventoryItem.damaged_qty || 0;

    // Calculate dispatched from records
    const dispatchedQty = isSerialized
        ? serials.filter(s => s.status === 'DISPATCHED').length
        : history.filter(h => h.movement_type === 'OUT').reduce((sum, h) => sum + (h.quantity || 0), 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="px-5 py-3.5 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <Package className="w-5 h-5 text-indigo-200" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm truncate">
                                        {inventoryItem.product?.product_name || inventoryItem.product_name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-mono text-indigo-300 truncate">
                                            {inventoryItem.product?.sku || "N/A"}
                                        </p>
                                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-bold text-indigo-200 uppercase">
                                            {inventoryItem.product?.product_type || "STOCK"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 opacity-70 hover:opacity-100" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl text-center">
                                    <p className="text-[8px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">Available</p>
                                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{availableQty.toLocaleString()}</p>
                                </div>
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-center">
                                    <p className="text-[8px] uppercase font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">Dispatched</p>
                                    <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">{dispatchedQty.toLocaleString()}</p>
                                </div>
                                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 rounded-xl text-center">
                                    <p className="text-[8px] uppercase font-bold text-rose-600 dark:text-rose-400 mb-0.5">Damaged</p>
                                    <p className="text-sm font-black text-rose-700 dark:text-rose-300">{damagedQty.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={isSerialized ? "Find serial ID..." : "Search history..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>

                            {/* List */}
                            <div className="space-y-1.5 min-h-[200px]">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
                                    {isSerialized ? "Serial IDs" : "Movement History"}
                                </h4>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <p className="text-xs font-medium">Fetching details...</p>
                                    </div>
                                ) : isSerialized ? (
                                    filteredSerials.length === 0 ? (
                                        <div className="py-10 text-center text-slate-400">
                                            <Tag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs">No matching IDs found</p>
                                        </div>
                                    ) : (
                                        filteredSerials.map((s, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded ${s.status === 'DISPATCHED' ? 'bg-indigo-100 text-indigo-600' :
                                                        s.status === 'DAMAGED' ? 'bg-rose-100 text-rose-600' :
                                                            'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                        <Tag className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-xs font-mono font-bold tracking-tight text-slate-700 dark:text-slate-300">
                                                        {s.serial_number}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${s.status === 'DISPATCHED' ? 'bg-indigo-500 text-white' :
                                                        s.status === 'DAMAGED' ? 'bg-rose-500 text-white' :
                                                            'bg-emerald-500 text-white'
                                                        }`}>
                                                        {s.status === 'IN_STOCK' || s.status === 'GOOD' ? 'Available' : s.status}
                                                    </span>
                                                    {s.status === 'DISPATCHED' ? <Truck className="w-3 h-3 text-indigo-500" /> :
                                                        s.status === 'DAMAGED' ? <AlertCircle className="w-3 h-3 text-rose-500" /> :
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    filteredHistory.length === 0 ? (
                                        <div className="py-10 text-center text-slate-400">
                                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs">No movements recorded</p>
                                        </div>
                                    ) : (
                                        filteredHistory.map((h, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-1.5 rounded shrink-0 ${h.movement_type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {h.movement_type === 'IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    </div>
                                                    <div className="min-w-0 overflow-hidden">
                                                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block leading-tight truncate">
                                                            {h.movement_subtype}
                                                        </span>
                                                        <span className="text-[8px] text-slate-500 block truncate">
                                                            {h.notes || h.reference_id || "No notes"} · {new Date(h.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pl-2">
                                                    <span className={`text-xs font-black ${h.movement_type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {h.movement_type === 'IN' ? '+' : '-'}{h.quantity}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                        Units
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
