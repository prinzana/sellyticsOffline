/**
 * Debts Cache - Dexie Operations for Offline Support
 * Handles local storage and sync queue for debts
 */
/**
 * NOTE: This file expects the Dexie database to be imported from your existing setup.
 * Update the import path below to match your project structure.
 * Example: import db from '@/db/dexie' or wherever your dexie.js is located
 */
import db from './dexieDb';
// Import from your existing Dexie setup - update path as needed
// This assumes the db is exported from wherever your existing dexie.js file is located

try {
    // Try common paths - adjust based on your actual structure
    db = require('./dexie').default || require('./dexie');
} catch (e) {
    console.warn('Dexie import failed, using window.db fallback');
    db = window.db;
}

// UUID generation without external dependency
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// ==================== DEBT CACHE OPERATIONS ====================

/**
 * Get all debts from local cache
 */
export const getCachedDebts = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return [];

        return await db.debts
            .where('store_id')
            .equals(sid)
            .reverse()
            .sortBy('created_at');
    } catch (error) {
        console.error('Error getting cached debts:', error);
        return [];
    }
};

/**
 * Get a single debt by ID
 */
export const getCachedDebtById = async (debtId) => {
    try {
        return await db.debts.get(debtId);
    } catch (error) {
        console.error('Error getting cached debt:', error);
        return null;
    }
};

/**
 * Save debt to local cache (create or update)
 */
export const cacheDebt = async (debt) => {
    try {
        const now = new Date().toISOString();
        const debtData = {
            ...debt,
            updated_at: now,
            _offline_status: debt._offline_status || 'synced',
        };

        await db.debts.put(debtData);
        return debtData;
    } catch (error) {
        console.error('Error caching debt:', error);
        throw error;
    }
};

/**
 * Create a new debt offline
 */
export const createDebtOffline = async (debtData, storeId) => {
    try {
        const now = new Date().toISOString();
        const offlineId = `offline_${uuidv4()}`;
        const clientRef = `debt_create_${uuidv4()}`;

        const debt = {
            ...debtData,
            id: offlineId,
            _offline_id: offlineId,
            _offline_status: 'pending',
            _synced: false,
            _client_ref: clientRef,
            store_id: Number(storeId),
            created_at: now,
            updated_at: now,
        };

        // Save to local cache
        await db.debts.put(debt);

        // Add to sync queue
        await addToSyncQueue({
            entity_type: 'debts',
            operation: 'create',
            entity_id: offlineId,
            store_id: Number(storeId),
            data: debt,
            client_ref: clientRef,
        });

        return debt;
    } catch (error) {
        console.error('Error creating debt offline:', error);
        throw error;
    }
};

/**
 * Update a debt offline
 */
export const updateDebtOffline = async (debtId, updates, storeId) => {
    try {
        const existing = await db.debts.get(debtId);
        if (!existing) {
            throw new Error('Debt not found in local cache');
        }

        const now = new Date().toISOString();
        const clientRef = `debt_update_${uuidv4()}`;

        const updatedDebt = {
            ...existing,
            ...updates,
            updated_at: now,
            _offline_status: 'pending',
            _synced: false,
            _client_ref: clientRef,
        };

        // Save to local cache
        await db.debts.put(updatedDebt);

        // Only queue sync if this is a real (server) ID
        const isOfflineCreated = String(debtId).startsWith('offline_');

        if (!isOfflineCreated) {
            await addToSyncQueue({
                entity_type: 'debts',
                operation: 'update',
                entity_id: debtId,
                store_id: Number(storeId),
                data: updatedDebt,
                client_ref: clientRef,
            });
        }

        return updatedDebt;
    } catch (error) {
        console.error('Error updating debt offline:', error);
        throw error;
    }
};

/**
 * Delete a debt offline
 */
export const deleteDebtOffline = async (debtId, storeId) => {
    try {
        const existing = await db.debts.get(debtId);
        const clientRef = `debt_delete_${uuidv4()}`;

        // Remove from local cache
        await db.debts.delete(debtId);

        // Only queue sync if this is a real (server) ID
        const isOfflineCreated = String(debtId).startsWith('offline_');

        if (!isOfflineCreated && existing) {
            await addToSyncQueue({
                entity_type: 'debts',
                operation: 'delete',
                entity_id: debtId,
                store_id: Number(storeId),
                data: { id: debtId },
                client_ref: clientRef,
            });
        }

        return true;
    } catch (error) {
        console.error('Error deleting debt offline:', error);
        throw error;
    }
};

/**
 * Bulk cache debts from server
 */
export const bulkCacheDebts = async (debts, storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return;

        // Clear existing synced debts for this store
        await db.debts
            .where('store_id')
            .equals(sid)
            .and(item => item._offline_status === 'synced' || !item._offline_status)
            .delete();

        // Insert new debts
        const debtsWithStatus = debts.map(debt => ({
            ...debt,
            store_id: sid,
            _offline_status: 'synced',
            _synced: true,
        }));

        await db.debts.bulkPut(debtsWithStatus);
    } catch (error) {
        console.error('Error bulk caching debts:', error);
        throw error;
    }
};

/**
 * Mark debt as synced (after successful server sync)
 */
export const markDebtSynced = async (offlineId, serverId) => {
    try {
        const existing = await db.debts.get(offlineId);
        if (!existing) return;

        // Delete the offline version
        await db.debts.delete(offlineId);

        // Insert with server ID
        const syncedDebt = {
            ...existing,
            id: serverId,
            _offline_id: undefined,
            _offline_status: 'synced',
            _synced: true,
            _client_ref: undefined,
        };

        await db.debts.put(syncedDebt);
        return syncedDebt;
    } catch (error) {
        console.error('Error marking debt as synced:', error);
        throw error;
    }
};

// ==================== SYNC QUEUE OPERATIONS ====================

/**
 * Add item to sync queue
 */
export const addToSyncQueue = async (item) => {
    try {
        const now = new Date().toISOString();
        const queueItem = {
            ...item,
            status: 'pending',
            priority: item.priority || 1,
            created_at: now,
            retry_count: 0,
        };

        await db.offline_queue.add(queueItem);
        return queueItem;
    } catch (error) {
        console.error('Error adding to sync queue:', error);
        throw error;
    }
};

/**
 * Get pending debt sync items
 */
export const getPendingDebtSyncItems = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return [];

        return await db.offline_queue
            .where({ store_id: sid, entity_type: 'debts', status: 'pending' })
            .toArray();
    } catch (error) {
        console.error('Error getting pending sync items:', error);
        return [];
    }
};

/**
 * Mark queue item as synced
 */
export const markQueueItemSynced = async (clientRef) => {
    try {
        await db.offline_queue
            .where('client_ref')
            .equals(clientRef)
            .modify({ status: 'synced' });
    } catch (error) {
        console.error('Error marking queue item synced:', error);
    }
};

/**
 * Mark queue item as failed
 */
export const markQueueItemFailed = async (clientRef, error) => {
    try {
        await db.offline_queue
            .where('client_ref')
            .equals(clientRef)
            .modify({
                status: 'failed',
                error_message: error?.message || 'Unknown error',
                retry_count: db.offline_queue.retry_count + 1,
            });
    } catch (err) {
        console.error('Error marking queue item failed:', err);
    }
};

/**
 * Get pending sync count for debts
 */
export const getPendingDebtSyncCount = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return 0;

        return await db.offline_queue
            .where({ store_id: sid, entity_type: 'debts', status: 'pending' })
            .count();
    } catch (error) {
        console.error('Error getting pending sync count:', error);
        return 0;
    }
};

/**
 * Clear synced queue items
 */
export const clearSyncedQueueItems = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return;

        await db.offline_queue
            .where({ store_id: sid, entity_type: 'debts', status: 'synced' })
            .delete();
    } catch (error) {
        console.error('Error clearing synced queue items:', error);
    }
};

export default {
    getCachedDebts,
    getCachedDebtById,
    cacheDebt,
    createDebtOffline,
    updateDebtOffline,
    deleteDebtOffline,
    bulkCacheDebts,
    markDebtSynced,
    addToSyncQueue,
    getPendingDebtSyncItems,
    markQueueItemSynced,
    markQueueItemFailed,
    getPendingDebtSyncCount,
    clearSyncedQueueItems,
};