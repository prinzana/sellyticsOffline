import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Search, Calendar, User, Package, Plus, Minus, RefreshCw, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import inventoryService from './services/inventoryServices'; // Fix import path if needed
import { cacheLogEntries, getLogEntries, deleteLogEntry, clearLogEntries } from '../db/inventoryCache';
import toast from 'react-hot-toast';

export default function HistoryPage({ storeId, productId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [openMenuId, setOpenMenuId] = useState(null); // Track open dropdown
  const [isDeleting, setIsDeleting] = useState(false);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.history-menu-trigger') && !event.target.closest('.history-menu-dropdown')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchActivities = useCallback(async () => {
    if (!storeId) return;

    setLoading(true);
    let fetchedOnline = false;

    try {
      const { data, error } = await supabase
        .from('product_inventory_adjustments_logs')
        .select(`
          id,
          dynamic_product_id,
          dynamic_inventory_id,
          updated_by,
          updated_by_email,
          old_quantity,
          new_quantity,
          difference,
          reason,
          metadata,
          created_at,
          dynamic_product (
            id,
            name
          )
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data?.length) {
        await cacheLogEntries(data, storeId);
      }

      setActivities(data || []);
      fetchedOnline = true;
    } catch (err) {
      console.warn('⚠️ Failed to fetch history online:', err);
    }

    const cachedData = await getLogEntries(storeId, productId);
    if (!fetchedOnline || (cachedData?.length && !fetchedOnline)) {
      setActivities(cachedData || []);
    }

    setLoading(false);
  }, [storeId, productId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this activity log?')) return;

    setIsDeleting(true);
    setOpenMenuId(null);

    try {
      // 1. Delete from Offline Cache (Optimistic)
      await deleteLogEntry(logId);
      setActivities(prev => prev.filter(a => a.id !== logId));

      // 2. Delete from Server
      await inventoryService.deleteActivityLog(logId);
      toast.success('Activity log deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete log from server');
      // Re-fetch to sync state if needed, or assume cache deletion stands for offline
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to CLEAR ALL history? This cannot be undone.')) return;

    setIsDeleting(true);
    try {
      // 1. Clear Cache
      await clearLogEntries(storeId);
      setActivities([]);

      // 2. Clear Server
      await inventoryService.clearActivityLogs(storeId);
      toast.success('History cleared successfully');
    } catch (err) {
      console.error('Clear failed:', err);
      toast.error('Failed to clear history');
      fetchActivities(); // Restore on error
    } finally {
      setIsDeleting(false);
    }
  };


  // ==================== FILTERING ====================
  const filteredActivities = activities.filter(activity => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      activity.dynamic_product?.name?.toLowerCase().includes(searchLower) ||
      activity.updated_by_email?.toLowerCase().includes(searchLower) ||
      activity.reason?.toLowerCase().includes(searchLower);

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const activityDate = new Date(activity.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = activityDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = activityDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = activityDate >= monthAgo;
      }
    }

    let matchesType = true;
    if (typeFilter !== 'all') {
      if (typeFilter === 'increase') matchesType = activity.difference > 0;
      else if (typeFilter === 'decrease') matchesType = activity.difference < 0;
    }

    return matchesSearch && matchesDate && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12 px-3">
        <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ==================== RENDER ====================
  return (
    <div className="space-y-2.5 sm:space-y-3 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3 px-3 sm:px-4 md:px-6">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">Activity History</h2>
          <p className="text-[9px] sm:text-xs text-slate-500 mt-0.5">{filteredActivities.length} record{filteredActivities.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {activities.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={isDeleting}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 rounded-lg hover:bg-red-100 transition-colors active:scale-95 text-xs sm:text-sm font-medium flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Clear All</span>
            </button>
          )}
          <button
            onClick={fetchActivities}
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors active:scale-95 text-xs sm:text-sm font-medium flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-2 sm:p-3 space-y-2 mx-3 sm:mx-4 md:mx-6">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 sm:pl-10 pr-2.5 sm:pr-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] sm:text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:gap-2">
          <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5">
            {['all', 'today', 'week', 'month'].map(filter => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-1.5 sm:px-2.5 py-1 rounded text-[9px] sm:text-xs font-medium transition-colors flex-shrink-0 ${dateFilter === filter
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
              >
                {filter === 'all' ? 'All' : filter === 'today' ? 'Today' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-1.5 sm:px-2.5 py-1 rounded text-[9px] sm:text-xs font-medium transition-colors flex-shrink-0 ${typeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('increase')}
              className={`flex items-center gap-0.5 px-1.5 sm:px-2.5 py-1 rounded text-[9px] sm:text-xs font-medium transition-colors flex-shrink-0 ${typeFilter === 'increase' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
            >
              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden xs:inline">Add</span>
            </button>
            <button
              onClick={() => setTypeFilter('decrease')}
              className={`flex items-center gap-0.5 px-1.5 sm:px-2.5 py-1 rounded text-[9px] sm:text-xs font-medium transition-colors flex-shrink-0 ${typeFilter === 'decrease' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
            >
              <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden xs:inline">Remove</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-1.5 sm:space-y-2 px-3 sm:px-4 md:px-6">
        <AnimatePresence>
          {filteredActivities.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-8 text-center">
              <History className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs sm:text-sm text-slate-500">No activities</p>
            </div>
          ) : (
            filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 hover:shadow-md transition-shadow relative"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex items-start gap-2 sm:gap-2.5 flex-1 min-w-0 pr-6">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.difference > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                      {activity.difference > 0 ? (
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      ) : (
                        <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {activity.dynamic_product?.name || 'Unknown'}
                        </h3>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-xs font-medium flex-shrink-0 ${activity.difference > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                          {activity.difference > 0 ? '+' : ''}{activity.difference}
                        </span>
                      </div>

                      <div className="mt-1.5 space-y-0.5 text-[9px] sm:text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Package className="w-3 h-3 flex-shrink-0" />
                          <span>{activity.old_quantity}→{activity.new_quantity}</span>
                        </div>

                        {activity.updated_by_email && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{activity.updated_by_email}</span>
                          </div>
                        )}
                      </div>

                      {activity.reason && (
                        <div className="mt-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded text-[8px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
                          {activity.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-[8px] sm:text-xs text-slate-500 flex-shrink-0 text-right">
                    <div className="flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      <span className="hidden xs:inline">{new Date(activity.created_at).toLocaleDateString()}</span>
                      <span className="xs:hidden">{new Date(activity.created_at).toLocaleDateString('en', { month: '2-digit', day: '2-digit' })}</span>
                    </div>
                    <div className="mt-0.5 hidden sm:block">{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>

                  {/* Dropdown Trigger */}
                  <div className="absolute right-2 top-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === activity.id ? null : activity.id);
                      }}
                      className="history-menu-trigger p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {openMenuId === activity.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className="history-menu-dropdown absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-10 overflow-hidden"
                        >
                          <button
                            onClick={() => handleDeleteLog(activity.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Log
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
