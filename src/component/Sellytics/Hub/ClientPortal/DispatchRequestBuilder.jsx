import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, Send, Package, Info } from "lucide-react";

export default function DispatchRequestBuilder({ isOpen, onClose, inventory, onSubmit, loading }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [notes, setNotes] = useState("");

    const addItem = (invItem) => {
        if (selectedItems.find(i => i.product_id === invItem.warehouse_product_id)) return;

        setSelectedItems([...selectedItems, {
            product_id: invItem.warehouse_product_id,
            product_name: invItem.product.product_name,
            max_qty: invItem.available_qty,
            quantity: 1
        }]);
    };

    const updateQty = (index, qty) => {
        const updated = [...selectedItems];
        const val = Math.max(1, Math.min(updated[index].max_qty, parseInt(qty) || 1));
        updated[index].quantity = val;
        setSelectedItems(updated);
    };

    const removeItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) return;
        const success = await onSubmit({ notes, items: selectedItems });
        if (success) {
            setSelectedItems([]);
            setNotes("");
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">New Dispatch Request</h2>
                        <p className="text-slate-500 text-sm">Select products and quantities to ship</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Step 1: Add Products */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">1</span>
                            Add Products
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {inventory.filter(i => i.available_qty > 0).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addItem(item)}
                                    disabled={selectedItems.some(si => si.product_id === item.warehouse_product_id)}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-left disabled:opacity-50 disabled:bg-slate-50"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <Package className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{item.product.product_name}</p>
                                        <p className="text-[10px] text-emerald-600 font-bold">{item.available_qty} available</p>
                                    </div>
                                    <Plus className="w-4 h-4 text-slate-400 ml-auto" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Review & Quantities */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">2</span>
                            Review Request
                        </div>

                        {selectedItems.length === 0 ? (
                            <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200">
                                <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm font-medium">No items selected yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedItems.map((item, idx) => (
                                    <div key={item.product_id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{item.product_name}</p>
                                            <p className="text-[10px] text-slate-400">Up to {item.max_qty} units</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateQty(idx, e.target.value)}
                                                className="w-20 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-center font-bold text-sm"
                                            />
                                            <button onClick={() => removeItem(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Step 3: Notes */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">3</span>
                            Additional Notes
                        </div>
                        <textarea
                            placeholder="Add any instructions for the warehouse (e.g. shipping labels, urgency)..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm min-h-[100px] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-20">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || selectedItems.length === 0}
                        className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit Request
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
