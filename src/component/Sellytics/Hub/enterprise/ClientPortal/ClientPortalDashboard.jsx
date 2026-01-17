// enterprise/ClientPortal/ClientPortalDashboard.jsx
// Client-facing dashboard with restricted access
import React, { useState } from "react";
import {
    Package,
    TrendingUp,
    TrendingDown,
    RotateCcw,

    Download,
    Clock,
    Building2
} from "lucide-react";
import RequestDetailsModal from "../components/RequestDetailsModal";
import InventoryDetailsModal from "../components/InventoryDetailsModal";
import { useClientPortal } from "./useClientPortal";


export default function ClientPortalDashboard({ accessToken }) {
    const portal = useClientPortal({ accessToken });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null);

    if (portal.isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!portal.isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-md w-full p-8 text-center">
                    <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {portal.clientInfo?.client_name || "Client Portal"}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Enter your email to access your dashboard
                    </p>

                    <form onSubmit={portal.verifyAccess} className="space-y-4">
                        <input
                            type="email"
                            value={portal.email}
                            onChange={(e) => portal.setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={portal.isVerifying}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                        >
                            {portal.isVerifying ? "Verifying..." : "Access Dashboard"}
                        </button>
                    </form>

                    {portal.error && (
                        <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">
                            {portal.error}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            {portal.clientInfo?.client_name}
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {portal.clientInfo?.business_name}
                        </p>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Logged in as {portal.email}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-900 rounded-lg shadow-sm">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {portalData.stats.totalProducts}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    Total Products
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {portalData.stats.totalStock}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    Units in Stock
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {portalData.stats.dispatched}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    Dispatched
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <RotateCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {portalData.stats.pendingReturns}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    Pending Returns
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Table */}
                {portal.permissions.view_inventory && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Your Inventory
                            </h2>
                            {portal.permissions.downloadReports && (
                                <button
                                    onClick={portal.downloadReport}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <div className="flex flex-col gap-2 p-4">
                                {portal.inventory.map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedInventory(item)}
                                        className="bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 cursor-pointer group"
                                    >
                                        {/* Icon */}
                                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                                            <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>

                                        {/* Name & SKU */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm">
                                                    {item.product?.product_name || item.product_name}
                                                </h4>
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">
                                                    {item.product?.product_type || "STOCK"}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5 leading-tight">
                                                {item.product?.sku || item.sku || "—"}
                                            </p>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 text-right shrink-0 pr-1">
                                            <div>
                                                <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">In Stock</p>
                                                <p className="text-base font-black text-slate-900 dark:text-white leading-none">{item.quantity.toLocaleString()}</p>
                                            </div>
                                            <div className="border-l border-slate-100 dark:border-slate-800 pl-4">
                                                <p className="text-[8px] uppercase font-black text-emerald-500 tracking-widest leading-none mb-1">Available</p>
                                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">{item.available_qty.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {portal.inventory.length === 0 && (
                                    <div className="p-12 text-center text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                        No inventory items found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Movements */}
                {portal.permissions.view_movements && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Recent Movements
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {portal.movements.slice(0, 10).map((move, index) => (
                                <div key={index} className="px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${move.movement_type === "IN"
                                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                                            : "bg-rose-100 dark:bg-rose-900/30"
                                            }`}>
                                            {move.movement_type === "IN" ? (
                                                <TrendingUp className={`w-4 h-4 text-emerald-600 dark:text-emerald-400`} />
                                            ) : (
                                                <TrendingDown className={`w-4 h-4 text-rose-600 dark:text-rose-400`} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                {move.product?.product_name || "Product"}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {move.movement_subtype} · {move.quantity} units
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {new Date(move.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {portal.movements.length === 0 && (
                                <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    No movements to display
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
