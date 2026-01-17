/**
 * Debts Cache - Dexie Operations for Offline Support
 * Handles local storage and sync queue for debts
 */
import db from './dexieDb';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : ((r & 0x3) | 0x8); // 👈 parentheses added
        return v.toString(16);
    });
};


export const getCachedDebts = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return [];
        return await db.debts.where('store_id').equals(sid).reverse().sortBy('created_at');
    } catch (error) {
        console.error('Error getting cached debts:', error);
        return [];
    }
};

export const getCachedDebtById = async (debtId) => {
    try {
        return await db.debts.get(debtId);
    } catch (error) {
        console.error('Error getting cached debt:', error);
        return null;
    }
};

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

        await db.debts.put(debt);

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

export const updateDebtOffline = async (debtId, updates, storeId) => {
    try {
        const existing = await db.debts.get(debtId);
        if (!existing) throw new Error('Debt not found in local cache');

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

        await db.debts.put(updatedDebt);

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

export const deleteDebtOffline = async (debtId, storeId) => {
    try {
        const existing = await db.debts.get(debtId);
        const clientRef = `debt_delete_${uuidv4()}`;

        await db.debts.delete(debtId);

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

export const bulkCacheDebts = async (debts, storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return;

        // 1. Get all pending operations to prevent "ghost" records
        const pendingQueue = await db.offline_queue
            .where({ store_id: sid, entity_type: 'debts' })
            .toArray();

        const deletedIds = new Set(
            pendingQueue
                .filter(q => q.operation === 'delete')
                .map(q => q.entity_id)
        );

        // 2. Clear only "synced" local records to avoid wiping pending changes
        await db.debts
            .where('store_id')
            .equals(sid)
            .and(item => item._offline_status === 'synced' || !item._offline_status)
            .delete();

        // 3. Prepare new records, filtering out ones we just deleted offline
        const debtsWithStatus = debts
            .filter(d => !deletedIds.has(d.id))
            .map(debt => ({
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

export const markDebtSynced = async (offlineId, serverId) => {
    try {
        const existing = await db.debts.get(offlineId);
        if (!existing) return;

        await db.debts.delete(offlineId);

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

export const getPendingDebtSyncItems = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return [];
        return await db.offline_queue.where({ store_id: sid, entity_type: 'debts', status: 'pending' }).toArray();
    } catch (error) {
        console.error('Error getting pending sync items:', error);
        return [];
    }
};

export const markQueueItemSynced = async (clientRef) => {
    try {
        await db.offline_queue.where('client_ref').equals(clientRef).modify({ status: 'synced' });
    } catch (error) {
        console.error('Error marking queue item synced:', error);
    }
};

export const markQueueItemFailed = async (clientRef, error) => {
    try {
        await db.offline_queue.where('client_ref').equals(clientRef).modify({
            status: 'failed',
            error_message: error?.message || 'Unknown error',
        });
    } catch (err) {
        console.error('Error marking queue item failed:', err);
    }
};

export const getPendingDebtSyncCount = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return 0;
        return await db.offline_queue.where({ store_id: sid, entity_type: 'debts', status: 'pending' }).count();
    } catch (error) {
        console.error('Error getting pending sync count:', error);
        return 0;
    }
};

export const clearSyncedQueueItems = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return;
        await db.offline_queue.where({ store_id: sid, entity_type: 'debts', status: 'synced' }).delete();
    } catch (error) {
        console.error('Error clearing synced queue items:', error);
    }
};