import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Scan, Package, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BulkRestockModal({
    products = [], // List of all available products to select from
    onClose,
    onSubmit,
    isSubmitting,
    onScanClick // Callback to open scanner
}) {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showProductSearch, setShowProductSearch] = useState(false);

    // Filter products for the dropdown
    const filteredProducts = products.filter(p => {
        const name = p.dynamic_product?.name || '';
        const search = searchTerm || '';
        return name.toLowerCase().includes(search.toLowerCase()) &&
            !items.some(item => item.productId === p.dynamic_product_id)
    });

    const handleAddItem = (inventoryItem) => {
        const product = inventoryItem.dynamic_product;
        setItems(prev => [
            ...prev,
            {
                productId: product.id,
                name: product.name,
                quantity: 1,
                reason: 'Restock',
                isUnique: product.is_unique,
                currentStock: inventoryItem.available_qty || 0
            }
        ]);
        setSearchTerm('');
        setShowProductSearch(false);
    };

    const handleRemoveItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateItem = (index, field, value) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            return { ...item, [field]: value };
        }));
    };

    const handleSubmit = () => {
        if (items.length === 0) {
            toast.error('Please add at least one product');
            return;
        }

        // Validate
        const invalidItems = items.filter(i => i.quantity <= 0);
        if (invalidItems.length > 0) {
            toast.error('All items must have a quantity greater than 0');
            return;
        }

        onSubmit(items);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Package className="w-6 h-6 text-indigo-600" />
                            Bulk Restock
                        </h2>
                        <p className="text-sm text-slate-500">Add multiple items to inventory at once</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Add Product Section */}
                    <div className="relative">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search to add product..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowProductSearch(true);
                                    }}
                                    onFocus={() => setShowProductSearch(true)}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                />
                                {showProductSearch && searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-4 text-center text-slate-500 text-sm">No products found</div>
                                        ) : (
                                            filteredProducts.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleAddItem(item)}
                                                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center justify-between group transition-colors"
                                                >
                                                    <span className="font-medium text-slate-900 dark:text-gray-200">
                                                        {item.dynamic_product?.name || 'Unknown Product'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded-full group-hover:bg-white dark:group-hover:bg-slate-500 transition-colors">
                                                        Current: {item.available_qty || 0}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onScanClick}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm active:scale-95"
                            >
                                <Scan className="w-5 h-5" />
                                Scan
                            </button>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {items.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50"
                                >
                                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No items added yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Search or scan products to build your restock list</p>
                                </motion.div>
                            )}

                            {items.map((item, index) => (
                                <motion.div
                                    key={index}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
                                >
                                    <div className="flex gap-4 items-start sm:items-center flex-col sm:flex-row">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</span>
                                                {item.isUnique && (
                                                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase rounded-full tracking-wider">
                                                        Unique
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-3">
                                                <span>Current Stock: <span className="font-medium text-slate-700 dark:text-slate-300">{item.currentStock}</span></span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="flex flex-col gap-1 w-24">
                                                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                    disabled={item.isUnique}
                                                    className={`w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center ${item.isUnique ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800' : ''
                                                        }`}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1 w-32">
                                                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Reason</label>
                                                <select
                                                    value={item.reason}
                                                    onChange={(e) => handleUpdateItem(index, 'reason', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                                >
                                                    <option>Restock</option>
                                                    <option>Return</option>
                                                    <option>Correction</option>
                                                </select>
                                            </div>

                                            <button
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-4 sm:mt-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {item.isUnique && (
                                        <div className="mt-3 py-2 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30 flex items-center justify-between">
                                            <span className="text-xs text-purple-700 dark:text-purple-300">
                                                Unique product restock requires IMEI entry.
                                                <span className="opacity-70 mx-1">(Not fully supported in bulk yet)</span>
                                            </span>
                                            <button className="text-[10px] bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded">
                                                Add IMEIs
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center z-10">
                    <div className="text-sm text-slate-500">
                        <span className="font-bold text-slate-900 dark:text-white mr-1">{items.length}</span>
                        items selected
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || items.length === 0}
                            className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:transform-none flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Restock All
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
