
import {
    Package,

    Save,

    Loader2,
    Tag,
    Hash,
    DollarSign,

} from "lucide-react";

import { ScannerPanel } from "../components/ScannerPanel";
import { useBatchProductEntry } from "./useBatchProductEntry";

const PRODUCT_TYPES = [
    { value: "SERIALIZED", label: "Serialized", desc: "Each unit has a unique barcode/serial" },
    { value: "BATCH", label: "Batch", desc: "All units share the same barcode" },
    { value: "STANDARD", label: "Standard", desc: "Manual quantity entry" },
];

/**
 * BATCH PRODUCT ENTRY
 * 
 * Allows users to add multiple products with unique IDs in a single session.
 * Each scanned barcode represents one unit for SERIALIZED products.
 * Quantity auto-calculates from scanned IDs.
 */
export default function BatchProductEntry({
    warehouseId,
    clientId,
    onSuccess,
    onCancel
}) {
    const batch = useBatchProductEntry({ warehouseId, clientId, onSuccess });

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-indigo-900">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Batch Product Entry
                </h2>
                <p className="text-sm text-white/80 mt-1">
                    Add multiple products with unique barcodes/serials
                </p>
            </div>

            <div className="p-4 space-y-6">
                {/* Product Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Name */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <Tag className="w-4 h-4" />
                            Product Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={batch.productName}
                            onChange={(e) => batch.setProductName(e.target.value)}
                            placeholder="e.g., iPhone 15 Pro Max 256GB"
                            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* SKU */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <Hash className="w-4 h-4" />
                            SKU (Optional)
                        </label>
                        <input
                            type="text"
                            value={batch.sku}
                            onChange={(e) => batch.setSku(e.target.value.toUpperCase())}
                            placeholder="e.g., IP15-PRO-256"
                            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                    </div>
                </div>

                {/* Product Type Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Product Type
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {PRODUCT_TYPES.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => batch.setProductType(type.value)}
                                className={`p-3 rounded-lg border-2 text-left transition ${batch.productType === type.value
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                    }`}
                            >
                                <div className={`font-semibold text-sm ${batch.productType === type.value
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-900 dark:text-white"
                                    }`}>
                                    {type.label}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {type.desc}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Unit Cost */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <DollarSign className="w-4 h-4" />
                        Unit Cost (Optional)
                    </label>
                    <div className="relative max-w-xs">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={batch.unitCost}
                            onChange={(e) => batch.setUnitCost(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Scanner Panel - Show for SERIALIZED and BATCH */}
                {(batch.productType === "SERIALIZED" || batch.productType === "BATCH") && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Scan Product Barcodes/Serials
                            </label>
                            {batch.scanner.scannedItems.length > 0 && (
                                <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                    {batch.scanner.stats.unique} units will be added
                                </span>
                            )}
                        </div>
                        <ScannerPanel
                            scanner={batch.scanner}
                            productName={batch.productName || "Product"}
                            showQuantity={true}
                        />
                    </div>
                )}

                {/* Manual Quantity - Show for STANDARD and BATCH */}
                {(batch.productType === "STANDARD" || batch.productType === "BATCH") && (
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <Hash className="w-4 h-4" />
                            Quantity {batch.productType === "BATCH" && <span className="text-xs font-normal text-slate-500">(Scan or Enter)</span>}
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={batch.quantity}
                            onChange={(e) => batch.setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="max-w-xs px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-semibold"
                        />
                    </div>
                )}

                {/* Queue Summary Table */}
                {batch.productsList.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-medium text-slate-700 dark:text-slate-300">Added Products</h3>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-2">Name</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Qty</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {batch.productsList.map((item, index) => (
                                    <tr key={index} className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                        <td className="px-4 py-2 text-slate-500">{item.type}</td>
                                        <td className="px-4 py-2 text-indigo-600 font-semibold">{item.quantity}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button
                                                onClick={() => batch.removeProduct(index)}
                                                className="text-rose-500 hover:text-rose-700 text-xs font-medium"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary of Current Item */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        Item Summary (Current)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Product</div>
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                                {batch.productName || "—"}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Type</div>
                            <div className="font-medium text-slate-900 dark:text-white">
                                {PRODUCT_TYPES.find(t => t.value === batch.productType)?.label}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Quantity</div>
                            <div className="font-medium text-indigo-600 dark:text-indigo-400 text-lg">
                                {/* Use manual quantity state for BATCH and STANDARD */}
                                {(batch.productType === "STANDARD" || batch.productType === "BATCH") ? batch.quantity : batch.scanner.calculatedQuantity}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Total Cost</div>
                            <div className="font-medium text-slate-900 dark:text-white">
                                {batch.unitCost ? `$${(parseFloat(batch.unitCost) * ((batch.productType === "STANDARD" || batch.productType === "BATCH") ? batch.quantity : batch.scanner.calculatedQuantity)).toFixed(2)}` : "—"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {/* Add to List Button */}
                    <button
                        type="button"
                        onClick={batch.addToQueue}
                        disabled={!batch.productName.trim() || (batch.productType !== "STANDARD" && batch.scanner.stats.unique === 0 && batch.scanner.scannedItems.length === 0)}
                        className="w-full py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Package className="w-5 h-5" />
                        Add Line Item to List
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={batch.handleSubmitAll}
                            disabled={batch.isSubmitting || batch.productsList.length === 0}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition disabled:cursor-not-allowed"
                        >
                            {batch.isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting Batch...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save All ({batch.productsList.length}) Products
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
