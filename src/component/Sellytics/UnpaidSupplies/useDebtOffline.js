/**
 * useDebtOffline Hook
 * Handles offline-first debt operations with automatic sync
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import {
    getCachedDebts,
    createDebtOffline,
    updateDebtOffline,
    deleteDebtOffline,
    bulkCacheDebts,
    getPendingDebtSyncCount,
} from '../db/debtsCache';
import { syncAllPendingDebts } from './debtsSyncHandler';

export default function useDebtOffline() {
    const storeId = localStorage.getItem('store_id');

    const [debts, setDebts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncError, setSyncError] = useState(null);

    const syncIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    const updatePendingCount = useCallback(async () => {
        if (!storeId) return;
        const count = await getPendingDebtSyncCount(storeId);
        if (isMountedRef.current) setPendingSyncCount(count);
    }, [storeId]);

    const fetchFromCache = useCallback(async () => {
        if (!storeId) return [];
        try {
            const cached = await getCachedDebts(storeId);
            return cached || [];
        } catch (error) {
            console.error('Fetch from cache error:', error);
            return [];
        }
    }, [storeId]);

    const fetchFromServer = useCallback(async () => {
        if (!storeId || !isOnline) return null;

        try {
            const { data, error } = await supabase
                .from('debts')
                .select('*')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            await bulkCacheDebts(data || [], storeId);
            return data || [];
        } catch (error) {
            console.error('Fetch from server error:', error);
            return null;
        }
    }, [storeId, isOnline]);

    const fetchDebts = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);

        try {
            let data;
            if (isOnline) {
                data = await fetchFromServer();
                if (data === null) data = await fetchFromCache();
            } else {
                data = await fetchFromCache();
            }

            const formatted = (data || []).map(d => ({
                ...d,
                deviceIds: d.device_id?.split(',').map(s => s.trim()).filter(Boolean) || [],
                deviceSizes: d.device_sizes?.split(',').map(s => s.trim()).filter(Boolean) || [],
            }));

            if (isMountedRef.current) setDebts(formatted);
            await updatePendingCount();
        } catch (error) {
            console.error('Fetch debts error:', error);
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    }, [storeId, isOnline, fetchFromServer, fetchFromCache, updatePendingCount]);

    const performSync = useCallback(async () => {
        if (!storeId || !isOnline || isSyncing) return;

        setIsSyncing(true);
        setSyncError(null);

        try {
            const result = await syncAllPendingDebts(storeId);

            if (result.synced > 0) {
                toast.success(`Synced ${result.synced} debt(s)`, { icon: '✅', duration: 2000 });
            }
            if (result.failed > 0) {
                toast.error(`${result.failed} sync(s) failed`, { duration: 3000 });
            }

            await fetchFromServer();
            setLastSyncTime(new Date());
            await updatePendingCount();
            // Force a re-fetch to update the UI immediately after sync
            await fetchDebts();
        } catch (error) {
            console.error('Sync error:', error);
            setSyncError(error.message);
        } finally {
            if (isMountedRef.current) setIsSyncing(false);
        }
    }, [storeId, isOnline, isSyncing, updatePendingCount, fetchFromServer, fetchDebts]);

    const createDebt = useCallback(async (debtData) => {
        if (!storeId) throw new Error('Store ID not found');

        try {
            if (isOnline) {
                const { data, error } = await supabase.from('debts').insert({ ...debtData, store_id: Number(storeId) }).select().single();
                if (error) throw error;
                await bulkCacheDebts([data], storeId);
                await fetchDebts();
                return data;
            } else {
                const result = await createDebtOffline(debtData, storeId);
                await fetchDebts();
                await updatePendingCount();
                toast('Saved offline - will sync when online', { icon: '📴', duration: 3000, style: { background: '#FEF3C7', color: '#92400E' } });
                return result;
            }
        } catch (error) {
            if (isOnline && error.message !== 'Failed to fetch') throw error;
            const result = await createDebtOffline(debtData, storeId);
            await fetchDebts();
            await updatePendingCount();
            return result;
        }
    }, [storeId, isOnline, fetchDebts, updatePendingCount]);

    const updateDebt = useCallback(async (debtId, updates) => {
        if (!storeId) throw new Error('Store ID not found');

        try {
            const isOfflineId = String(debtId).startsWith('offline_');

            if (isOnline && !isOfflineId) {
                const { data, error } = await supabase.from('debts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', debtId).select().single();
                if (error) throw error;
                await fetchDebts();
                return data;
            } else {
                const result = await updateDebtOffline(debtId, updates, storeId);
                await fetchDebts();
                await updatePendingCount();
                if (!isOfflineId) toast('Updated offline - will sync when online', { icon: '📴', duration: 3000 });
                return result;
            }
        } catch (error) {
            const result = await updateDebtOffline(debtId, updates, storeId);
            await fetchDebts();
            await updatePendingCount();
            return result;
        }
    }, [storeId, isOnline, fetchDebts, updatePendingCount]);

    const deleteDebt = useCallback(async (debtId) => {
        if (!storeId) throw new Error('Store ID not found');

        try {
            const isOfflineId = String(debtId).startsWith('offline_');
            if (isOnline && !isOfflineId) {
                const { error } = await supabase.from('debts').delete().eq('id', debtId);
                if (error) throw error;
            }
            await deleteDebtOffline(debtId, storeId);
            await fetchDebts();
            await updatePendingCount();
            return { success: true };
        } catch (error) {
            await deleteDebtOffline(debtId, storeId);
            await fetchDebts();
            await updatePendingCount();
            toast('Deleted offline - will sync when online', { icon: '📴', duration: 3000 });
            return { success: true };
        }
    }, [storeId, isOnline, fetchDebts, updatePendingCount]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Back online! Syncing...', { icon: '🌐', duration: 2000 });
            performSync();
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast('Working offline', { icon: '📴', duration: 3000, style: { background: '#FEF3C7', color: '#92400E' } });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [performSync]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchDebts();

        syncIntervalRef.current = setInterval(() => {
            if (navigator.onLine) {
                updatePendingCount();
                getPendingDebtSyncCount(storeId).then(count => {
                    if (count > 0) performSync();
                });
            }
        }, 30000);

        return () => {
            isMountedRef.current = false;
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [storeId, fetchDebts, performSync, updatePendingCount]);

    return {
        debts,
        isLoading,
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncTime,
        syncError,
        fetchDebts,
        createDebt,
        updateDebt,
        deleteDebt,
        performSync,
        updatePendingCount,
    };
}