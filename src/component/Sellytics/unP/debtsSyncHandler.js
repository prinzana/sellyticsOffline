/**
 * Debts Sync Handler
 * Handles syncing offline debts to Supabase
 */
import { supabase } from '../../../supabaseClient';
import {
    markDebtSynced,
    markQueueItemSynced,
    markQueueItemFailed,
    getPendingDebtSyncItems,
    clearSyncedQueueItems,
} from '../db/debtsCache';

/**
 * Get creator metadata for new records
 */
const getCreatorMetadata = () => {
    const userEmail = localStorage.getItem('user_email');
    const userId = localStorage.getItem('user_id');
    return {
        created_by: userEmail || null,
        user_id: userId ? Number(userId) : null,
    };
};

/**
 * Clean debt data for Supabase (remove offline-specific fields)
 */
const cleanDebtData = (data) => {
    const cleaned = { ...data };
    delete cleaned._offline_status;
    delete cleaned._synced;
    delete cleaned._offline_id;
    delete cleaned._client_ref;
    delete cleaned._sync_attempts;
    delete cleaned.server_id;

    // Don't send offline-generated IDs to server
    if (String(cleaned.id).startsWith('offline_')) {
        delete cleaned.id;
    }

    return cleaned;
};

/**
 * Handle debt creation sync
 */
export async function createDebtSync(item) {
    const metadata = getCreatorMetadata();
    const { data } = item;

    try {
        // Check if already synced (by _offline_id)
        if (data._offline_id) {
            const { data: existing } = await supabase
                .from('debts')
                .select('id')
                .eq('_offline_id', data._offline_id)
                .limit(1);

            if (existing?.length > 0) {
                await markDebtSynced(data._offline_id, existing[0].id);
                await markQueueItemSynced(item.client_ref);
                return { success: true, skipped: true, id: existing[0].id };
            }
        }

        // Clean and prepare data
        const cleanData = cleanDebtData(data);

        // Insert into Supabase
        const { data: result, error } = await supabase
            .from('debts')
            .insert({
                ...cleanData,
                ...metadata,
                _offline_id: data._offline_id, // Keep for duplicate detection
            })
            .select()
            .single();

        if (error) throw error;

        // Mark as synced locally
        await markDebtSynced(data._offline_id || data.id, result.id);
        await markQueueItemSynced(item.client_ref);

        return { success: true, id: result.id, data: result };
    } catch (error) {
        console.error('Create debt sync error:', error);
        await markQueueItemFailed(item.client_ref, error);
        throw error;
    }
}

/**
 * Handle debt update sync
 */
export async function updateDebtSync(item) {
    const { data, entity_id } = item;

    try {
        const cleanData = cleanDebtData(data);
        cleanData.updated_at = new Date().toISOString();

        const { data: result, error } = await supabase
            .from('debts')
            .update(cleanData)
            .eq('id', entity_id)
            .select()
            .single();

        if (error) throw error;

        await markQueueItemSynced(item.client_ref);
        return { success: true, data: result };
    } catch (error) {
        console.error('Update debt sync error:', error);
        await markQueueItemFailed(item.client_ref, error);
        throw error;
    }
}

/**
 * Handle debt deletion sync
 */
export async function deleteDebtSync(item) {
    const { entity_id } = item;

    try {
        const { error } = await supabase
            .from('debts')
            .delete()
            .eq('id', entity_id);

        if (error) throw error;

        await markQueueItemSynced(item.client_ref);
        return { success: true };
    } catch (error) {
        console.error('Delete debt sync error:', error);
        await markQueueItemFailed(item.client_ref, error);
        throw error;
    }
}

/**
 * Process a single sync item based on operation type
 */
export async function processSyncItem(item) {
    switch (item.operation) {
        case 'create':
            return await createDebtSync(item);
        case 'update':
            return await updateDebtSync(item);
        case 'delete':
            return await deleteDebtSync(item);
        default:
            console.warn('Unknown sync operation:', item.operation);
            return { success: false, error: 'Unknown operation' };
    }
}

/**
 * Sync all pending debts for a store
 */
export async function syncAllPendingDebts(storeId, onProgress) {
    const pendingItems = await getPendingDebtSyncItems(storeId);

    if (pendingItems.length === 0) {
        return { synced: 0, failed: 0, total: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
        try {
            await processSyncItem(item);
            synced++;

            if (onProgress) {
                onProgress({ synced, failed, total: pendingItems.length, current: item });
            }
        } catch (error) {
            console.error('Sync item failed:', item, error);
            failed++;

            if (onProgress) {
                onProgress({ synced, failed, total: pendingItems.length, current: item, error });
            }
        }
    }

    // Clean up synced items
    await clearSyncedQueueItems(storeId);

    return { synced, failed, total: pendingItems.length };
}

export default {
    createDebtSync,
    updateDebtSync,
    deleteDebtSync,
    processSyncItem,
    syncAllPendingDebts,
};