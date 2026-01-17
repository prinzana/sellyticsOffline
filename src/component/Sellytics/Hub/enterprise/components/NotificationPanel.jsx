import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, ExternalLink, Package, Clock, Trash2 } from "lucide-react";

export default function NotificationPanel({
    isOpen,
    onClose,
    notifications,
    unreadCount,
    markAsRead,
    clearAllRead,
    loading
}) {
    const panelRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/10 pointer-events-auto"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-sm bg-white shadow-2xl h-screen flex flex-col pointer-events-auto border-l border-slate-200"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell className="w-6 h-6 text-slate-900" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="px-6 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Activity</span>
                            <button
                                onClick={clearAllRead}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear Read
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Bell className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-slate-900 font-bold mb-1">All caught up!</h3>
                                    <p className="text-slate-500 text-sm">No new notifications to show right now.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`p-5 group hover:bg-slate-50 transition-all relative ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                                        >
                                            {!n.is_read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                                            )}

                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'DISPATCH_REQUEST' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {n.type === 'DISPATCH_REQUEST' ? <Package className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                                                            {n.title}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap pt-0.5">
                                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                                        {n.message}
                                                    </p>

                                                    <div className="flex items-center gap-2">
                                                        {n.link && (
                                                            <a
                                                                href={n.link}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    markAsRead(n.id);
                                                                    // Navigate logic would go here, maybe window.location or a prop
                                                                    window.location.href = n.link;
                                                                }}
                                                                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-2 py-1 rounded-md"
                                                            >
                                                                View Request
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                        {!n.is_read && (
                                                            <button
                                                                onClick={() => markAsRead(n.id)}
                                                                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-emerald-600 transition-colors"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                                Mark read
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                <Clock className="w-3 h-3" />
                                Updated just now
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
