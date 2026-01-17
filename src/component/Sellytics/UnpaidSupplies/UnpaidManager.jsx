import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, RefreshCw, Wifi, WifiOff, AlertCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import DebtTable from './DebtTable';
import EditDebtModalWithOffline from './EditDebtModalWithOffline';
import DebtDetailModal from './DebtDetailModal';
import ScannerModal from './ScannerModal';
import useDebtWithOffline from './useDebtWithOffline';
import SyncStatusBadge from './SyncStatusBadge';
import OfflineIndicator from './OfflineIndicator';
import { getUserPermission } from '../../../utils/accessControl';
import { useCurrency } from '../../context/currencyContext';

export default function DebtsManager() {
  const { formatPrice } = useCurrency();
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
        <div className="text-center p-0 bg-white dark:bg-slate-800 rounded-2xl shadow-lg max-w-md">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* Title */}
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              Debts
            </h1>
            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">
              Offline debt management
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SyncStatusBadge
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingSyncCount={pendingSyncCount}
              lastSyncTime={lastSyncTime}
              syncError={syncError}
              onSyncClick={performSync}
              compact
            />

            <button
              onClick={() => setEditing({})}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm
                 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                 shadow shadow-indigo-500/20 font-semibold w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">Add</span>
            </button>
          </div>

        </div>


        {/* Sync Status Bar */}
        <AnimatePresence mode="wait">
          {(!isOnline || pendingSyncCount > 0) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <SyncStatusBadge isOnline={isOnline} isSyncing={isSyncing} pendingSyncCount={pendingSyncCount} lastSyncTime={lastSyncTime} syncError={syncError} onSyncClick={performSync} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">

          {/* TOTAL */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full whitespace-nowrap">
                {stats.total}
              </span>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Total Worth
            </p>
            <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {formatPrice(stats.totalOwed)}
            </p>
          </motion.div>

          {/* UNPAID */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full whitespace-nowrap">
                {stats.unpaid}
              </span>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Unpaid
            </p>
            <p className="text-base sm:text-xl font-bold text-red-600 truncate">
              {formatPrice(stats.totalBalance)}
            </p>
          </motion.div>

          {/* PAID */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full whitespace-nowrap">
                {stats.paid}
              </span>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Paid
            </p>
            <p className="text-base sm:text-xl font-bold text-emerald-600 truncate">
              {formatPrice(stats.totalPaid)}
            </p>
          </motion.div>

          {/* SYNC */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full whitespace-nowrap">
                Sync
              </span>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Pending
            </p>

            <div className="flex items-center gap-1">
              <p className="text-base sm:text-xl font-bold text-amber-600 truncate">
                {pendingSyncCount}
              </p>
              {!isOnline && (
                <span className="text-[9px] font-bold uppercase text-amber-600 whitespace-nowrap">
                  Offline
                </span>
              )}
            </div>
          </motion.div>

        </div>
        {/* Search */}
        <div className="relative w-full max-w-full sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

          <input
            type="text"
            placeholder="Search customer, product, phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
      w-full
      pl-9 pr-3 py-2.5
      text-sm
      bg-white dark:bg-slate-800
      border border-slate-200 dark:border-slate-700
      rounded-lg
      focus:ring-2 focus:ring-indigo-500
      focus:border-transparent
      transition-all
      truncate
    "
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
                  <DebtTable debt={debt} onViewDetail={setShowDetail} onEdit={setEditing} onDelete={deleteDebtFromDatabase} permissions={permissions} />
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
            <EditDebtModalWithOffline initialData={editing} onClose={() => setEditing(null)} onSuccess={() => { setEditing(null); fetchDebts(); }} />
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