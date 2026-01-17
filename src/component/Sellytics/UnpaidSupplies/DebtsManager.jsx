// src/components/Debts/DebtsManager.jsx - UPDATED WITH OFFLINE SUPPORT
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, RefreshCw, Wifi, WifiOff, AlertCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import DebtCard from './DebtCard';
import EditDebtModal from './EditDebtModal';
import DebtDetailModal from './DebtDetailModal';
import ScannerModal from './ScannerModal';
import useDebtWithOffline from './hooks/useDebtWithOffline';
import SyncStatusBadge from './ui/SyncStatusBadge';
import OfflineIndicator from './ui/OfflineIndicator';
import { getUserPermission } from '../../utils/accessControl';

export default function DebtsManager() {
    const {
        filteredDebts = [],
        stats,
        searchTerm,
        setSearchTerm,
        editing,
        setEditing,
        showDetail,
        setShowDetail,
        showScanner,
        handleScanSuccess,
        closeScanner,
        fetchDebts,
        deleteDebtFromDatabase,
        isLoading = false,
        error = null,
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncTime,
        syncError,
        performSync,
    } = useDebtWithOffline();

    const storeId = localStorage.getItem('store_id');
    const currentUserEmail = localStorage.getItem('user_email');

    const [permissions, setPermissions] = useState({ canView: false, canEdit: false, canDelete: false });

    useEffect(() => {
        async function loadPermissions() {
            if (!storeId || !currentUserEmail) return;
            const perms = await getUserPermission(storeId, currentUserEmail);
            setPermissions({ canView: perms.canView, canEdit: perms.canEdit, canDelete: perms.canDelete });
        }
        loadPermissions();
    }, [storeId, currentUserEmail]);

    if (!storeId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Store ID Missing</h2>
                    <p className="text-gray-600 dark:text-gray-400">Please log in to access debt management.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Debts Overview</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage customer debts with offline support</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <SyncStatusBadge isOnline={isOnline} isSyncing={isSyncing} pendingSyncCount={pendingSyncCount} lastSyncTime={lastSyncTime} syncError={syncError} onSyncClick={performSync} compact />
                        <button onClick={() => setEditing({})} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-lg shadow-indigo-500/25 font-medium">
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">Add Debt</span>
                        </button>
                    </div>
                </div>

                {/* Sync Status Bar */}
                <AnimatePresence>
                    {(!isOnline || pendingSyncCount > 0) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <SyncStatusBadge isOnline={isOnline} isSyncing={isSyncing} pendingSyncCount={pendingSyncCount} lastSyncTime={lastSyncTime} syncError={syncError} onSyncClick={performSync} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total Debts</p>
                                <p className="text-xl font-bold">{stats.total}</p>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Unpaid</p>
                                <p className="text-xl font-bold text-red-600">{stats.unpaid}</p>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                                <p className="text-xl font-bold text-emerald-600">{stats.paid}</p>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                {isOnline ? <Wifi className="w-5 h-5 text-amber-600 dark:text-amber-400" /> : <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Sync</p>
                                <p className="text-xl font-bold text-amber-600">{stats.pendingSync}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Search */}
                <div className="relative max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by customer, product, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                )}

                {error && !isLoading && (
                    <div className="text-center py-12 text-red-600">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                        <p>Error: {error}</p>
                    </div>
                )}

                {!isLoading && !error && filteredDebts.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                            <DollarSign className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{searchTerm ? 'No debts found' : 'No debts yet'}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">{searchTerm ? 'Try adjusting your search terms' : 'Add your first debt to get started'}</p>
                        {!searchTerm && (
                            <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium">
                                <Plus className="w-5 h-5" />
                                Add New Debt
                            </button>
                        )}
                    </motion.div>
                )}

                {!isLoading && !error && filteredDebts.length > 0 && (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredDebts.map((debt) => (
                                <div key={debt.id} className="relative">
                                    <DebtCard debt={debt} onViewDetail={setShowDetail} onEdit={setEditing} onDelete={deleteDebtFromDatabase} permissions={permissions} />
                                    {debt._offline_status === 'pending' && (
                                        <div className="absolute top-2 left-2">
                                            <OfflineIndicator status="pending" size="xs" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                <AnimatePresence>
                    {editing !== null && (
                        <EditDebtModal initialData={editing} onClose={() => setEditing(null)} onSuccess={() => { setEditing(null); fetchDebts(); }} />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showDetail && <DebtDetailModal debt={showDetail} onClose={() => setShowDetail(null)} />}
                </AnimatePresence>

                <ScannerModal show={showScanner} scannerMode="external" setScannerMode={() => { }} continuousScan={false} setContinuousScan={() => { }} manualInput="" setManualInput={() => { }} onManualSubmit={() => { }} processScannedCode={handleScanSuccess} onClose={closeScanner} />
            </div>
        </div>
    );
}