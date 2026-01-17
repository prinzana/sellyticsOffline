import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Package, Search, Plus, Upload, Layers, Users, Store } from "lucide-react";

import { ProductDetailsModal } from "./InvSubsection/ProductDetailsModal";
import { InventoryTable } from "./InvSubsection/InventoryTable";
import { InventoryMobileCards } from "./InvSubsection/InventoryMobileCards";

export default function InventorySection({
  isInternal,
  searchQuery,
  setSearchQuery,
  filteredInventory,
  productsLoading,
  inventoryLoading,
  formatPrice,
  productModal,
  onShowBatchEntry,
  onShowImport,
  onShowCollaboration,
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const confirmDelete = (product) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${product.product_name}"?\n\nThis action cannot be undone.`
      )
    ) {
      productModal.deleteProduct(product);
    }
  };

  return (
    <motion.div
      key="inventory"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* ✅ WIRED MODAL */}
      <ProductDetailsModal
        product={selectedProduct?.product}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* INTERNAL STORE NOTICE */}
      {isInternal && (
        <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="flex gap-3">
            <Store className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900">
                Your Company Store
              </p>
              <p className="text-sm text-emerald-700">
                Manage internal inventory with full control.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CARD */}
      <div className="bg-white rounded-xl shadow-lg border">
        {/* HEADER */}
        {/* HEADER – ORIGINAL DESIGN */}
        {/* HEADER – ORIGINAL DESIGN */}
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
              Current Inventory
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {onShowImport && (
                  <button
                    onClick={onShowImport}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition"
                    title="Import CSV"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                )}

                {onShowBatchEntry && (
                  <button
                    onClick={onShowBatchEntry}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 text-sm font-medium transition"
                    title="Batch Entry"
                  >
                    <Layers className="w-4 h-4" />
                    <span className="hidden sm:inline">Batch</span>
                  </button>
                )}

                {onShowCollaboration && (
                  <button
                    onClick={onShowCollaboration}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-violet-300 text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 text-sm font-medium transition"
                    title="Collaboration"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => productModal.open()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* CONTENT */}
        <div className="p-4 sm:p-6">
          {productsLoading || inventoryLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-16 h-16 mx-auto mb-4" />
              No inventory found
            </div>
          ) : (
            <>
              {/* ✅ WIRED DESKTOP */}
              <InventoryTable
                items={filteredInventory}
                onSelect={setSelectedProduct}
                formatPrice={formatPrice}
                productModal={productModal}
                confirmDelete={confirmDelete}
              />

              {/* ✅ WIRED MOBILE */}
              <InventoryMobileCards
                items={filteredInventory}
                onSelect={setSelectedProduct}
                productModal={productModal}
                confirmDelete={confirmDelete}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
