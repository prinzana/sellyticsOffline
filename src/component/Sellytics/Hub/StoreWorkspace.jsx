// components/StoreWorkspace/StoreWorkspace.jsx
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

import StockInForm from "./StockInForm";
import DispatchForm from "./DispatchForm";
import ReturnsCenter from "./ReturnsCenter";
import ProductModal from "./ProductModal";

import StoreHeader from "./StoreHeader";
import InventorySection from "./InventorySection";
import HistorySection from "./HistorySection";

// ENTERPRISE IMPORTS
import BatchProductEntry from "./enterprise/BatchProductEntry/BatchProductEntry";
import ImportWizard from "./enterprise/Import/ImportWizard";
import CollaborationPanel from "./enterprise/Collaboration/CollaborationPanel";
import DispatchRequestsView from "./enterprise/components/DispatchRequestsView";

import { useSession } from "./useSession";
import { useWarehouseProducts } from "./useWarehouseProducts";
import { useWarehouseInventory } from "./useWarehouseInventory";
import { useProductModal } from "./useProductModal";
import { useLedger } from "./useLedger";
import { useCurrency } from "../../context/currencyContext";
import { usePortalAdmin } from "./enterprise/hooks/usePortalAdmin";
import { useNotifications } from "./enterprise/hooks/useNotifications";

export default function StoreWorkspace({ store, warehouseId, onBack }) {
    const { userId } = useSession();
    const [activeTab, setActiveTab] = useState("inventory");
    const [searchQuery, setSearchQuery] = useState("");
    const { unreadCount } = useNotifications({ warehouseId, clientId: store.id });

    // ENTERPRISE: Modal states
    const [showBatchEntry, setShowBatchEntry] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [showCollaboration, setShowCollaboration] = useState(false);

    const { formatPrice } = useCurrency();
    const isInternal = store.client_type === "SELLYTICS_STORE";

    const { products, loading: productsLoading, refetch: refetchProducts } =
        useWarehouseProducts(warehouseId, store.id);

    const { inventory, loading: inventoryLoading, refetch: refetchInventory } =
        useWarehouseInventory(warehouseId, store.id);

    const { entries: ledgerEntries, loading: ledgerLoading } = useLedger(store.id);

    const productModal = useProductModal({
        warehouseId,
        clientId: store.id,
        userId,
        onRefresh: () => {
            refetchProducts();
            refetchInventory();
        },
    });

    const { getPortalAccess } = usePortalAdmin({ warehouseId });

    const handleSharePortal = async () => {
        const access = await getPortalAccess(store);
        if (access) {
            const url = `${window.location.origin}/portal/${access.access_token}`;
            navigator.clipboard.writeText(url);
            toast.success("Portal link copied to clipboard!", {
                icon: "🔗",
                duration: 4000
            });
        }
    };

    const inventoryData = inventory
        .map((inv) => {
            const product = products.find((p) => p.id === inv.warehouse_product_id);
            return product ? { ...inv, product } : null;
        })
        .filter(Boolean);

    const filteredInventory = inventoryData.filter((item) => {
        const lower = searchQuery.toLowerCase();
        return (
            item.product.product_name?.toLowerCase().includes(lower) ||
            item.product.sku?.toLowerCase().includes(lower)
        );
    });

    const totalStock = inventoryData.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const availableStock = inventoryData.reduce((sum, i) => sum + (i.available_qty || 0), 0);
    const totalInventoryValue = inventoryData.reduce(
        (sum, i) => sum + (parseFloat(i.total_cost) || 0),
        0
    );

    const refreshData = () => {
        refetchProducts();
        refetchInventory();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50  dark:bg-slate-950 dark:text-gray-500" >
            <StoreHeader
                store={store}
                onBack={onBack}
                onSharePortal={handleSharePortal}
                totalStock={totalStock}
                availableStock={availableStock}
                totalInventoryValue={totalInventoryValue}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                unreadCount={unreadCount}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 ">
                <AnimatePresence mode="wait">
                    {activeTab === "inventory" && (
                        <InventorySection
                            isInternal={isInternal}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            filteredInventory={filteredInventory}
                            productsLoading={productsLoading}
                            inventoryLoading={inventoryLoading}
                            formatPrice={formatPrice}
                            productModal={productModal}
                            onShowBatchEntry={() => setShowBatchEntry(true)}
                            onShowImport={() => setShowImportWizard(true)}
                            onShowCollaboration={() => setShowCollaboration(true)}
                        />
                    )}

                    {activeTab === "stock-in" && (
                        <motion.div
                            key="stock-in"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <StockInForm
                                warehouseId={warehouseId}
                                clientId={store.id}
                                products={products}
                                onSuccess={refreshData}
                            />
                        </motion.div>
                    )}

                    {activeTab === "dispatch" && (
                        <motion.div
                            key="dispatch"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <DispatchForm
                                warehouseId={warehouseId}
                                clientId={store.id}
                                inventory={inventoryData}
                                onSuccess={refreshData}
                            />
                        </motion.div>
                    )}

                    {activeTab === "returns" && (
                        <motion.div
                            key="returns"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <ReturnsCenter warehouseId={warehouseId} clients={[store]} />
                        </motion.div>
                    )}

                    {activeTab === "requests" && (
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <DispatchRequestsView
                                warehouseId={warehouseId}
                                clientId={store.id}
                            />
                        </motion.div>
                    )}

                    {activeTab === "history" && (
                        <HistorySection
                            ledgerEntries={ledgerEntries}
                            ledgerLoading={ledgerLoading}



                        />
                    )}
                </AnimatePresence>
            </main>

            <ProductModal
                show={productModal.show}
                editingProduct={productModal.editingProduct}
                productName={productModal.productName}
                setProductName={productModal.setProductName}
                sku={productModal.sku}
                unitCost={productModal.unitCost}           // ← ADD THIS
                setDamagedQty={productModal.setDamagedQty}
                setQuantity={productModal.setQuantity}
                setUnitCost={productModal.setUnitCost}
                setSku={productModal.setSku}
                productType={productModal.productType}
                setProductType={productModal.setProductType}
                processing={productModal.processing}
                PRODUCT_TYPES={productModal.PRODUCT_TYPES}
                onClose={productModal.close}
                onSubmit={productModal.handleSubmit}
                deleteProduct={productModal.deleteProduct}

            />

            {/* ENTERPRISE MODALS */}

            {/* Batch Product Entry Modal */}
            <AnimatePresence>
                {showBatchEntry && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-8 pb-8 bg-black/50 overflow-y-auto"
                        onClick={(e) => e.target === e.currentTarget && setShowBatchEntry(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="max-w-2xl w-full my-auto"
                        >
                            <BatchProductEntry
                                warehouseId={warehouseId}
                                clientId={store.id}
                                onSuccess={() => {
                                    setShowBatchEntry(false);
                                    refreshData();
                                }}
                                onCancel={() => setShowBatchEntry(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Import Wizard Modal */}
            {showImportWizard && (
                <ImportWizard
                    warehouseId={warehouseId}
                    clientId={store.id}
                    onSuccess={() => {
                        setShowImportWizard(false);
                        refreshData();
                    }}
                    onClose={() => setShowImportWizard(false)}
                />
            )}

            {/* Collaboration Panel - Slide-out */}
            <CollaborationPanel
                warehouseId={warehouseId}
                clientId={store.id}
                isOpen={showCollaboration}
                onClose={() => setShowCollaboration(false)}
            />
        </div>
    );
}