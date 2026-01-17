// enterprise/components/ScannerPanel.jsx
// Reusable scanner panel component for all workflows
import React, { useRef, useEffect } from "react";
import {
    Scan,
    X,
    Trash2,
    Power,
    AlertTriangle,
    CheckCircle2,
    Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SCANNER PANEL COMPONENT
 * 
 * Drop this into any form/workflow to add barcode scanning.
 * Works with useScannerIntegration hook.
 * 
 * Usage:
 * ```jsx
 * const scanner = useScannerIntegration({ ... });
 * <ScannerPanel scanner={scanner} productName="iPhone 15" />
 * ```
 */
export function ScannerPanel({
    scanner,
    productName = "Product",
    showQuantity = true,
    compact = false,
    className = "",
}) {
    const inputRef = useRef(null);

    // Auto-focus input when scanner is active
    useEffect(() => {
        if (scanner.isActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [scanner.isActive]);

    if (compact && !scanner.isActive) {
        return (
            <button
                type="button"
                onClick={scanner.toggleScanner}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
                <Scan className="w-4 h-4" />
                Enable Scanner
            </button>
        );
    }

    return (
        <div className={`bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${scanner.isActive
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-gradient-to-r from-slate-500 to-slate-600"
                }`}>
                <div className="flex items-center gap-2 text-white">
                    <Scan className="w-5 h-5" />
                    <span className="font-semibold text-sm">
                        {scanner.isActive ? "Scanner Active" : "Barcode Scanner"}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={scanner.toggleScanner}
                    className={`p-1.5 rounded-lg transition ${scanner.isActive
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                >
                    <Power className="w-4 h-4" />
                </button>
            </div>

            <AnimatePresence>
                {scanner.isActive && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4 space-y-4">
                            {/* Scan Input */}
                            <form onSubmit={scanner.handleInputSubmit} className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={scanner.inputValue}
                                    onChange={(e) => scanner.setInputValue(e.target.value)}
                                    placeholder="Scan barcode or type manually..."
                                    className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    autoComplete="off"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!scanner.inputValue.trim()}
                                    className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <Scan className="w-5 h-5" />
                                </button>
                            </form>

                            {/* Stats Bar */}
                            <div className="flex items-center gap-4 text-sm">
                                {/* Only show Unique count for SERIALIZED */}
                                {(!scanner.productType || scanner.productType !== "BATCH") && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="font-medium">{scanner.stats.unique} Unique</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                                    <Hash className="w-4 h-4" />
                                    <span className="font-medium">{scanner.productType === "BATCH" ? "Count" : "Total"} {scanner.stats.total}</span>
                                </div>

                                {scanner.stats.duplicates > 0 && scanner.productType !== "BATCH" && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="font-medium">{scanner.stats.duplicates} Duplicates</span>
                                    </div>
                                )}

                                {showQuantity && (
                                    <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full font-semibold">
                                        Qty: {scanner.calculatedQuantity}
                                    </div>
                                )}
                            </div>

                            {/* Scanned Items List */}
                            {scanner.scannedItems.length > 0 && (
                                <div className="max-h-48 overflow-y-auto space-y-1.5">
                                    {/* BATCH VIEW: Show single consolidated entry */}
                                    {scanner.productType === "BATCH" ? (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-between"
                                        >
                                            <div className="space-y-1">
                                                <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">
                                                    Active Batch Barcode
                                                </div>
                                                <div className="font-mono text-lg font-bold text-indigo-700 dark:text-indigo-300">
                                                    {scanner.scannedItems[0]?.value}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                                    x{scanner.stats.total}
                                                </div>
                                                <div className="text-xs text-indigo-400">scanned</div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* STANDARD/SERIALIZED VIEW: Show all items */
                                        scanner.scannedItems.map((item, index) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${item.isDuplicate
                                                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                                                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">
                                                        #{index + 1}
                                                    </span>
                                                    <span className={`font-mono ${item.isDuplicate
                                                        ? "text-amber-700 dark:text-amber-400"
                                                        : "text-slate-900 dark:text-white"
                                                        }`}>
                                                        {item.value}
                                                    </span>
                                                    {item.isDuplicate && (
                                                        <span className="text-xs text-amber-600 dark:text-amber-500">
                                                            (duplicate)
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => scanner.removeScan(item.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Empty State */}
                            {scanner.scannedItems.length === 0 && (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <Scan className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Scan barcodes for {productName}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Use a scanner or type manually
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            {scanner.scannedItems.length > 0 && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={scanner.clearAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Clear All
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ScannerPanel;
