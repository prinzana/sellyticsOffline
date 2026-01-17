// enterprise/BulkOperations/BulkDeleteModal.jsx
// Multi-select delete with safeguards
import React, { useState } from "react";
import {
    Trash2,
    X,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Lock
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * BULK DELETE MODAL
 * 
 * Displays selected items for deletion with safety checks:
 * - Shows items with inventory (warning)
 * - Blocks items with active orders (locked)
 * - Requires confirmation text to proceed
 */
export default function BulkDeleteModal({
    isOpen,
    onClose,
    selectedItems = [],
    onConfirmDelete,
    isDeleting = false,
}) {
    const [confirmText, setConfirmText] = useState("");

    if (!isOpen) return null;

    const deletableItems = selectedItems.filter(item => !item.hasActiveOrders);
    const blockedItems = selectedItems.filter(item => item.hasActiveOrders);
    const itemsWithInventory = deletableItems.filter(item => item.quantity > 0);

    const totalAffectedQuantity = itemsWithInventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const canDelete = confirmText.toLowerCase() === "delete" && deletableItems.length > 0;

    const handleDelete = () => {
        if (canDelete) {
            onConfirmDelete(deletableItems.map(i => i.id));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-rose-600 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Bulk Delete Products
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/20 text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Warning */}
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Warning:</strong> This action cannot be undone. Deleted products and their inventory records will be permanently removed.
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {selectedItems.length}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Selected</div>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {deletableItems.length}
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">Deletable</div>
                        </div>
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-center">
                            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                                {blockedItems.length}
                            </div>
                            <div className="text-xs text-rose-600 dark:text-rose-400">Blocked</div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {deletableItems.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between p-3 rounded-lg ${item.quantity > 0
                                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"
                                    : "bg-slate-50 dark:bg-slate-900/50"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {item.name || item.product_name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.quantity > 0 && (
                                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded">
                                            {item.quantity} units
                                        </span>
                                    )}
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                        Will delete
                                    </span>
                                </div>
                            </div>
                        ))}

                        {blockedItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-700 opacity-60"
                            >
                                <div className="flex items-center gap-3">
                                    <Lock className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-slate-500 dark:text-slate-400">
                                        {item.name || item.product_name}
                                    </span>
                                </div>
                                <span className="text-xs text-rose-600 dark:text-rose-400">
                                    Active orders
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Affected Inventory Notice */}
                    {totalAffectedQuantity > 0 && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-sm">
                            <strong className="text-rose-700 dark:text-rose-300">
                                {totalAffectedQuantity} units
                            </strong>{" "}
                            <span className="text-rose-600 dark:text-rose-400">
                                will be written off from inventory
                            </span>
                        </div>
                    )}

                    {/* Confirmation Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Type <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-center font-mono uppercase"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={!canDelete || isDeleting}
                        className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold rounded-lg flex items-center gap-2 transition disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-5 h-5" />
                                Delete {deletableItems.length} Products
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
