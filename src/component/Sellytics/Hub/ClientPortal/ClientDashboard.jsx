import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../supabaseClient";
import {
    Package,
    Truck,
    Clock,
    LayoutDashboard,
    Search,
    Loader2,
    LogOut,
    Bell,
    XCircle
} from "lucide-react";
import toast from "react-hot-toast";
import DispatchRequestBuilder from "./DispatchRequestBuilder";
import RequestDetailsModal from "../enterprise/components/RequestDetailsModal";
import { AnimatePresence } from "framer-motion";
import InventoryDetailsModal from "../enterprise/components/InventoryDetailsModal";

export default function ClientDashboard({ portalData, session, onDispatchRequest, fetchProductSerials, isSubmitting }) {
    const [activeTab, setActiveTab] = useState("inventory");
    const [inventory, setInventory] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isRequestBuilderOpen, setIsRequestBuilderOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null);

    const fetchContent = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Client Inventory
            const { data: invData } = await supabase
                .from("warehouse_inventory")
                .select(`
          *,
          product:warehouse_product_id (
            product_name, 
            sku, 
            product_type
          )
        `)
                .eq("warehouse_id", portalData.warehouse_id)
                .eq("client_id", portalData.client_id);

            setInventory(invData || []);

            // 2. Fetch Dispatch Requests
            const { data: reqData } = await supabase
                .from("warehouse_dispatch_requests")
                .select(`
          *,
          items:warehouse_dispatch_request_items (
            quantity,
            product:product_id (product_name)
          )
        `)
                .eq("client_id", portalData.client_id)
                .order("created_at", { ascending: false });

            setRequests(reqData || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [portalData.warehouse_id, portalData.client_id]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);



    const handleClearAllRequests = async () => {
        if (!window.confirm("This will remove all requests from your history. Continue?")) return;

        try {
            const { error } = await supabase
                .from("warehouse_dispatch_requests")
                .delete()
                .eq("client_id", portalData.client_id);

            if (error) throw error;
            toast.success("History cleared");
            fetchContent();
        } catch (error) {
            toast.error("Failed to clear history");
        }
    };



    const filteredInventory = inventory.filter(item =>
        item.product?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Client Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">
                                {portalData.client?.business_name || portalData.client?.client_name}
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => toast("Notifications are tracked in your dispatch history.", { icon: "🔔" })}
                                className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                            </button>
                            <div className="h-8 w-[1px] bg-slate-200 mx-1" />
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6 mb-4 sm:mb-8">

                    {/* TABS */}
                    <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg sm:rounded-xl w-full sm:w-fit">
                        <button
                            onClick={() => setActiveTab("inventory")}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold transition-all
          ${activeTab === "inventory"
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="hidden xs:inline">Inventory</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("requests")}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold transition-all
          ${activeTab === "requests"
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            <Truck className="w-4 h-4" />
                            <span className="hidden xs:inline">Requests</span>
                        </button>
                    </div>

                    {/* CLEAR BUTTON */}
                    {activeTab === "requests" && requests.length > 0 && (
                        <button
                            onClick={handleClearAllRequests}
                            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black
          text-rose-600 bg-rose-50 hover:bg-rose-100 transition border border-rose-100"
                        >
                            <XCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Clear All Requests</span>
                            <span className="sm:hidden">Clear</span>
                        </button>
                    )}
                </div>
                {activeTab === "inventory" ? (
                    <div className="space-y-4 sm:space-y-6">

                        {/* HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-2xl font-bold truncate">
                                    In-Stock Inventory
                                </h2>
                                <p className="text-[11px] sm:text-sm text-slate-500 truncate">
                                    Warehouse: <span className="font-medium text-slate-900">
                                        {portalData.warehouse?.name}
                                    </span>
                                </p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search"
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>

                        {/* CONTENT */}
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                                <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-semibold">No inventory found</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Allocated products appear here once stocked
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {filteredInventory.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedInventory(item)}
                                        className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition"
                                    >
                                        {/* ICON */}
                                        <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                                            <Package className="w-4 h-4 text-indigo-600" />
                                        </div>

                                        {/* INFO */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-semibold truncate">
                                                    {item.product?.product_name || item.product_name}
                                                </h4>
                                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-bold uppercase">
                                                    {item.product?.product_type}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-mono truncate">
                                                {item.product?.sku || "NO-SKU"}
                                            </p>
                                        </div>

                                        {/* STATS */}
                                        <div className="flex items-center gap-3 text-right shrink-0">
                                            <div className="text-[10px]">
                                                <p className="uppercase text-slate-400 font-bold">Avail</p>
                                                <p className="text-sm font-black text-indigo-600">
                                                    {item.available_qty}
                                                </p>
                                            </div>
                                            <div className="text-[10px]">
                                                <p className="uppercase text-slate-400 font-bold">Dam</p>
                                                <p className="text-sm font-black text-rose-500">
                                                    {item.damaged_qty}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">

                        {/* HEADER */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-bold">Order History</h2>
                                <p className="text-xs sm:text-sm text-slate-500">
                                    Shipment & request tracking
                                </p>
                            </div>

                            <button
                                onClick={() => setIsRequestBuilderOpen(true)}
                                className="px-3 sm:px-6 py-2 bg-indigo-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow hover:bg-indigo-700"
                            >
                                New Request
                            </button>
                        </div>

                        {/* LIST */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {requests.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No requests yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {requests.map((req) => (
                                        <div
                                            key={req.id}
                                            onClick={() => setSelectedRequest(req)}
                                            className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">
                                                    Request #{String(req.id).slice(0, 8)}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    {req.items?.length || 0} items •{" "}
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </p>
                                            </div>

                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold
                ${req.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                                                    req.status === "DISPATCHED" ? "bg-emerald-100 text-emerald-700" :
                                                        req.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
                                                            "bg-indigo-100 text-indigo-700"}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </main>

            <AnimatePresence>
                {isRequestBuilderOpen && (
                    <DispatchRequestBuilder
                        isOpen={isRequestBuilderOpen}
                        onClose={() => setIsRequestBuilderOpen(false)}
                        inventory={inventory}
                        onSubmit={async (data) => {
                            const success = await onDispatchRequest(data);
                            if (success) fetchContent();
                            return success;
                        }}
                        loading={isSubmitting}
                    />
                )}
            </AnimatePresence>

            <RequestDetailsModal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                request={selectedRequest}
            />

            <InventoryDetailsModal
                isOpen={!!selectedInventory}
                onClose={() => setSelectedInventory(null)}
                inventoryItem={selectedInventory}
                fetchSerials={fetchProductSerials}
            />
        </div>
    );
}
