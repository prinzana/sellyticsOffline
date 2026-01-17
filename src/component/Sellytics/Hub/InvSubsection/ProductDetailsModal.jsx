import { motion } from "framer-motion";
import {
    X,
    Trash2,
    Loader2,
    Package,
    Layers,
} from "lucide-react";
import { useProductSerials } from "./useProductSerials";

export function ProductDetailsModal({ product, isOpen, onClose }) {
    const {
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
        loadSerials,
        handleDeleteSerial,
        handleClearAll,
        handleClearHistory,
    } = useProductSerials({ product, isOpen, onClose });

    if (!isOpen) return null;

    const isSerialized = product.product_type === "SERIALIZED";
    const totalPages = Math.ceil(
        (isSerialized ? (totalCount + damagedCount + dispatchedCount) : historyCount) / pageSize
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header - More Compact */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                    <div className="min-w-0 pr-4">
                        <h3 className="text-sm sm:text-base font-bold tracking-tight truncate">{product.product_name}</h3>
                        <p className="text-[10px] sm:text-xs font-mono text-slate-400 truncate opacity-80">
                            {product.sku || "NO-SKU"} • {product.product_type}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={isSerialized ? handleClearAll : handleClearHistory}
                            className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded transition-all active:scale-95 ${isSerialized
                                ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white'
                                : 'border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white'
                                }`}
                        >
                            {isSerialized ? 'Reset' : 'Clear History'}
                        </button>
                        <button onClick={onClose} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-full transition-colors active:rotate-12">
                            <X className="w-4 h-4 sm:w-5 sm:h-5 rotate-45" />
                        </button>
                    </div>
                </div>

                {/* Internal Scrollable Content */}
                <div className="flex-1 overflow-y-auto subtle-scroll p-3 sm:p-5 space-y-4">

                    {/* Compact Stats Row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <Stat label="Available" value={totalCount} color="emerald" />
                        <Stat label="Damaged" value={damagedCount} color="rose" />
                        <Stat label="Dispatched" value={dispatchedCount} color="indigo" />
                    </div>

                    {/* Table Section */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 px-1">
                            {isSerialized ? <Layers className="w-3 h-3 text-indigo-500" /> : <Package className="w-3 h-3 text-emerald-500" />}
                            {isSerialized ? "Unit Identifiers" : "Movement Log"}
                        </h4>

                        {loading && page === 1 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Syncing records...</p>
                            </div>
                        ) : (isSerialized ? serials : history).length === 0 ? (
                            <div className="text-center py-10 text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/40">
                                <Package className="w-6 h-6 mx-auto mb-2 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Empty</p>
                            </div>
                        ) : (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                                <table className="w-full text-[11px] sm:text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                            {isSerialized ? (
                                                <>
                                                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left">Serial</th>
                                                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left">Status</th>
                                                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right">Del</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left">Activity</th>
                                                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right">Qty</th>
                                                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-right">Date</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isSerialized ? (
                                            serials.map((s) => (
                                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                                        {s.serial_number}
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${s.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                                                            s.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                                                        <button
                                                            onClick={() => handleDeleteSerial(s)}
                                                            disabled={deletingId === s.id}
                                                            className="p-1 hover:bg-rose-50 text-rose-400 disabled:opacity-30 rounded-md transition-colors"
                                                        >
                                                            {deletingId === s.id ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            history.map((h) => (
                                                <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 uppercase truncate max-w-[80px] sm:max-w-none">
                                                            {h.movement_subtype.replace('_', ' ')}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-medium truncate max-w-[100px] sm:max-w-none">
                                                            {h.notes || "No notes"}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-black">
                                                        <span className={h.movement_type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {h.movement_type === 'IN' ? '+' : '-'}{h.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right text-[10px] font-bold text-slate-400">
                                                        {new Date(h.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination - Compact */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {page} / {totalPages}
                            </span>
                            <div className="flex gap-1.5">
                                <button
                                    disabled={page === 1}
                                    onClick={() => {
                                        setPage(page - 1);
                                        loadSerials(page - 1);
                                    }}
                                    className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
                                >
                                    Prev
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => {
                                        setPage(page + 1);
                                        loadSerials(page + 1);
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-[10px] font-bold hover:opacity-90 disabled:opacity-30 transition-all shadow-sm active:scale-95"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Extra Compact */}
                <div className="px-4 py-3 sm:px-6 sm:py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                    >
                        Close Details
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function Stat({ label, value, color = "slate" }) {
    const colors = {
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
        rose: "bg-rose-50 text-rose-700 border-rose-100",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
        slate: "bg-slate-50 text-slate-700 border-slate-100",
    };

    return (
        <div className={`p-2 sm:p-2.5 ${colors[color]} border rounded-xl text-center transition-all hover:scale-[1.02]`}>
            <div className="text-[8px] uppercase font-black tracking-widest mb-0.5 opacity-60">
                {label}
            </div>
            <div className="text-sm sm:text-base font-black truncate">{value}</div>
        </div>
    );
}
