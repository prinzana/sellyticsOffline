import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Truck, Info } from "lucide-react";

export default function RequestDetailsModal({ isOpen, onClose, request, onUpdateStatus }) {
    if (!request) return null;

    const totalQty = request.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header - Compact */}
                        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`p-1.5 rounded-lg ${request.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                                    request.status === 'DISPATCHED' ? 'bg-emerald-500/20 text-emerald-400' :
                                        request.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' :
                                            'bg-indigo-500/20 text-indigo-400'
                                    }`}>
                                    <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-lg font-bold tracking-tight leading-none mb-1">Request Details</h3>
                                    <p className="text-[10px] sm:text-xs font-mono text-slate-400 truncate max-w-[120px] sm:max-w-none">
                                        #{String(request.id).substring(0, 12)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5 rotate-45" />
                            </button>
                        </div>

                        {/* Internal Scrollable Content */}
                        <div className="flex-1 overflow-y-auto subtle-scroll p-4 sm:p-6 space-y-4 sm:space-y-6">
                            {/* Compact Stats Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                <Stat label="Total Qty" value={totalQty} color="indigo" />
                                <Stat label="Status" value={request.status} color={
                                    request.status === 'PENDING' ? 'amber' :
                                        request.status === 'DISPATCHED' ? 'emerald' :
                                            request.status === 'REJECTED' ? 'rose' : 'indigo'
                                } />
                                <Stat
                                    label="Unique Items"
                                    value={request.items?.length || 0}
                                    color="slate"
                                    className="hidden sm:block"
                                />
                            </div>

                            {/* Compact Info Banner */}
                            {(request.completed_at || request.resolved_by || request.requested_by_email) && (
                                <div className="p-3 sm:p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                        <Info className="w-3 h-3" />
                                        Resolution Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] sm:text-xs">
                                        <div>
                                            <span className="text-slate-400 block mb-0.5 font-bold uppercase tracking-tighter">Requested By</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                                                {request.requested_by_email || "Client Representative"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block mb-0.5 font-bold uppercase tracking-tighter">Date Requested</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 block">
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {request.resolved_by && (
                                            <div>
                                                <span className="text-indigo-400 block mb-0.5 font-bold uppercase tracking-tighter">Dispatcher</span>
                                                <span className="font-bold text-indigo-700 dark:text-indigo-300 truncate block">
                                                    {request.resolved_by}
                                                </span>
                                            </div>
                                        )}
                                        {request.completed_at && (
                                            <div>
                                                <span className="text-emerald-400 block mb-0.5 font-bold uppercase tracking-tighter">Dispatched On</span>
                                                <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                                                    {new Date(request.completed_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Products Table - Fixed headers or compact feel */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    Products in Request
                                </h4>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                                    <table className="w-full text-[11px] sm:text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2 sm:px-5 sm:py-3 text-left">Product / SKU</th>
                                                <th className="px-4 py-2 sm:px-5 sm:py-3 text-right whitespace-nowrap">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {request.items?.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-2 sm:px-5 sm:py-3">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[250px]">
                                                            {item.product?.product_name || "Unknown Product"}
                                                        </div>
                                                        <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                                                            {item.product?.sku || "N/A"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 sm:px-5 sm:py-3 text-right">
                                                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                                                            {item.quantity.toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* User Notes - Compact */}
                            {request.notes && (
                                <div className="space-y-1.5">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Internal Notes</h4>
                                    <p className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/50 italic leading-snug">
                                        "{request.notes}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions - Sticky at bottom */}
                        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2 sm:justify-end shrink-0">
                            {onUpdateStatus && request.status === 'PENDING' && (
                                <>
                                    <button
                                        onClick={() => onUpdateStatus(request.id, 'REJECTED')}
                                        className="w-full sm:w-auto px-4 py-2 bg-white border border-rose-200 text-rose-600 text-[11px] sm:text-xs font-bold rounded-lg hover:bg-rose-50 transition active:scale-95"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => onUpdateStatus(request.id, 'APPROVED')}
                                        className="w-full sm:w-auto px-5 py-2 bg-indigo-600 text-white text-[11px] sm:text-xs font-bold rounded-lg hover:bg-indigo-700 transition shadow-md active:scale-95"
                                    >
                                        Approve
                                    </button>
                                </>
                            )}
                            {onUpdateStatus && request.status === 'APPROVED' && (
                                <button
                                    onClick={() => onUpdateStatus(request.id, 'DISPATCHED')}
                                    className="w-full sm:w-auto px-5 py-2 bg-emerald-600 text-white text-[11px] sm:text-xs font-bold rounded-lg hover:bg-emerald-700 transition shadow-md active:scale-95"
                                >
                                    Complete Dispatch
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto px-6 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-[11px] sm:text-xs font-bold hover:opacity-90 transition active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function Stat({ label, value, color = "slate", className = "" }) {
    const colors = {
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30",
        rose: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30",
        amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30",
        slate: "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50",
    };

    return (
        <div className={`p-2 sm:p-3 ${colors[color]} border rounded-xl text-center flex-1 min-w-0 ${className}`}>
            <div className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest mb-0.5 opacity-60">
                {label}
            </div>
            <div className="text-xs sm:text-base font-black truncate">{value}</div>
        </div>
    );
}
