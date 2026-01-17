// DispatchForm.jsx - Enhanced Dispatch with Barcode Scanning & Batch Selection
import React, { useRef, useEffect } from "react";
import {
  ArrowUpRight,
  Package,
  Send,
  Loader2,
  Plus,
  FileText,
  Minus,
  Trash2,
  ChevronDown,
  Scan,
  X,
  Barcode
} from "lucide-react";
import { useEnhancedDispatch } from "./enterprise/hooks/useEnhancedDispatch";

export default function DispatchForm({ warehouseId, clientId, inventory = [], onSuccess }) {
  const {
    dispatchItems,
    notes,
    setNotes,
    isSubmitting,
    totalItems,
    scanner,
    addItem,
    updateItemQuantity,
    updateItemProduct,
    removeItem,
    getProductInfo,
    handleDispatch,
    manualIdInput,
    setManualIdInput,
    handleManualIdLookup,
  } = useEnhancedDispatch({ warehouseId, clientId, inventory, onSuccess });

  const scanInputRef = useRef(null);

  // Focus scanner input when active
  useEffect(() => {
    if (scanner.isActive) {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [scanner.isActive]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header with Scanner Toggle */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-rose-600 to-pink-600 rounded-t-lg sm:rounded-t-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2 text-white">
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            Dispatch / Ship Out
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <input
                type="text"
                placeholder="ID Retrieval..."
                value={manualIdInput}
                onChange={(e) => setManualIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualIdLookup(manualIdInput)}
                className="px-3 py-1.5 w-32 sm:w-48 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder:text-white/50 focus:bg-white focus:text-slate-900 focus:outline-none transition-all"
              />
              <button
                onClick={() => handleManualIdLookup(manualIdInput)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={scanner.toggleScanner}
              className={`p-1.5 rounded-lg transition ${scanner.isActive ? "bg-white text-rose-600" : "bg-white/20 text-white hover:bg-white/30"}`}
            >
              <Scan className="w-4 h-4" />
            </button>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-white/20 text-white">
              <Package className="w-3 h-3" />
              {totalItems}
            </span>
          </div>
        </div>
      </div>

      {/* ENTERPRISE: Barcode Scanner Input */}
      {scanner.isActive && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20">
          <form onSubmit={scanner.handleInputSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
              <input
                ref={scanInputRef}
                type="text"
                value={scanner.inputValue}
                onChange={(e) => scanner.setInputValue(e.target.value)}
                placeholder="Scan barcode to add product..."
                className="w-full pl-10 pr-3 py-2.5 border border-emerald-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={scanner.stopSession}
              className="p-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </form>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
            Scan a barcode or type SKU to auto-add products. Scanning a Serial ID automatically adds that unique item.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Dispatch Items */}
        {dispatchItems.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No items in dispatch list</p>
            <button
              onClick={() => addItem()}
              className="text-rose-600 text-sm font-medium hover:underline mt-2"
            >
              Add Manually
            </button>
          </div>
        ) : (
          <div className="max-h-[350px] sm:max-h-[400px] overflow-y-auto space-y-3">
            {dispatchItems.map((item, index) => {
              const { available } = getProductInfo(item.productId);

              return (
                <div
                  key={index}
                  className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="space-y-3">
                    {/* Top Row: Product Select & Remove */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Product
                        </label>
                        <div className="relative">
                          <select
                            value={item.productId}
                            onChange={(e) => updateItemProduct(index, e.target.value)}
                            className="w-full px-3 py-2 pr-8 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            <option value="" disabled>Select product...</option>
                            {/* Use availableProducts from hook */}
                            {inventory.filter(i => i.available_qty > 0).map((inv) => {
                              const disabled = dispatchItems.some(
                                (d, i) => i !== index && d.productId === inv.product.id.toString()
                              );
                              return (
                                <option
                                  key={inv.product.id}
                                  value={inv.product.id.toString()}
                                  disabled={disabled && false} // Allow duplicate product selection if needed, but logic prefers single row per product
                                  className={disabled ? "text-slate-400" : ""}
                                >
                                  {inv.product.product_name} ({inv.available_qty})
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="mt-6 p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Second Row: Quantity & Serials */}
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-5 sm:col-span-4">
                        <label className="flex items-center justify-between text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          <span>Quantity</span>
                          {item.productId && <span className="text-slate-400">Max: {available}</span>}
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, -1)}
                            disabled={item.quantity <= 1 || item.productType === "SERIALIZED"}
                            className="h-9 w-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center disabled:opacity-50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) - item.quantity)}
                            className={`flex-1 h-9 text-center border border-slate-300 rounded-lg text-sm font-semibold ${item.productType === "SERIALIZED" ? "bg-slate-50 cursor-not-allowed" : ""}`}
                            readOnly={item.productType === "SERIALIZED"}
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, 1)}
                            disabled={item.quantity >= available || item.productType === "SERIALIZED"}
                            className="h-9 w-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Scanned Serials Display */}
                      <div className="col-span-12 sm:col-span-8 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          Scanned IDs (will be flagged dispatched)
                        </label>
                        {item.scannedSerials && item.scannedSerials.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.scannedSerials.map((serial, sIdx) => (
                              <span key={sIdx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {serial}
                              </span>
                            ))}
                            {item.quantity > item.scannedSerials.length && (
                              <span className="text-xs text-slate-400 italic py-0.5">
                                + {item.quantity - item.scannedSerials.length} more (untracted)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            No specific serials scanned yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Item Button - Compact */}
        <button
          type="button"
          onClick={() => addItem()}
          className="w-full py-3 sm:py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-rose-400 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5" />
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Shipping reference, destination, etc."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        {/* Submit Button - Compact */}
        <button
          onClick={handleDispatch}
          disabled={
            dispatchItems.length === 0 ||
            isSubmitting ||
            dispatchItems.some(i => !i.productId || i.quantity > getProductInfo(i.productId).available)
          }
          className="w-full h-11 sm:h-12 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm sm:text-base font-semibold rounded-lg transition flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              Dispatch {totalItems} Item{totalItems !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}