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

    return {
        created_by_email: userEmail || null,
    };
};

/**
 * Clean debt data for Supabase (remove ALL offline-specific fields)
 */
const cleanDebtData = (data) => {
    return {
        store_id: data.store_id,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        phone_number: data.phone_number || '',
        dynamic_product_id: data.dynamic_product_id,
        product_name: data.product_name,
        supplier: data.supplier || '',
        device_id: data.device_id || '',
        device_sizes: data.device_sizes || '',
        qty: data.qty,
        owed: data.owed,
        deposited: data.deposited || 0,
        date: data.date,
        is_returned: data.is_returned || false,
        remark: data.remark || '',
        payments: data.payments || [],
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
    };
};

/**
 * Handle debt creation sync
 */
export async function createDebtSync(item) {
    const metadata = getCreatorMetadata();
    const { data } = item;

    try {
        // Clean data - remove ALL offline-specific fields
        const cleanData = cleanDebtData(data);

        // Insert into Supabase (no offline columns in database)
        const { data: result, error } = await supabase
            .from('debts')
            .insert({
                ...cleanData,
                ...metadata,
            })
            .select()
            .single();

        if (error) throw error;

        // Update local Dexie record with server ID
        await markDebtSynced(data._offline_id || data.id, result.id);
        await markQueueItemSynced(item.client_ref);

        console.log('✅ Debt synced:', data._offline_id, '→', result.id);
        return { success: true, id: result.id, data: result };
    } catch (error) {
        console.error('Create debt sync error:', error);
        if (item?.client_ref) {
            await markQueueItemFailed(item.client_ref, error);
        }
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

        console.log('✅ Debt updated:', entity_id);
        return { success: true, data: result };
    } catch (error) {
        console.error('Update debt sync error:', error);
        if (item?.client_ref) {
            await markQueueItemFailed(item.client_ref, error);
        }
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

        console.log('✅ Debt deleted:', entity_id);
        return { success: true };
    } catch (error) {
        console.error('Delete debt sync error:', error);
        if (item?.client_ref) {
            await markQueueItemFailed(item.client_ref, error);
        }
        throw error;
    }
}

/**
 * Process a single sync item based on operation type
 */
export async function processSyncItem(item) {
    if (!item) {
        console.warn('Invalid sync item: item is null or undefined');
        return { success: false, error: 'Invalid item' };
    }

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
        console.log('📭 No pending debts to sync');
        return { synced: 0, failed: 0, total: 0 };
    }

    console.log(`🔄 Starting sync for ${pendingItems.length} pending debts...`);

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
            console.error('❌ Sync item failed:', item, error);
            failed++;

            if (onProgress) {
                onProgress({ synced, failed, total: pendingItems.length, current: item, error });
            }
        }
    }

    // Clean up synced items
    await clearSyncedQueueItems(storeId);

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed, total: pendingItems.length };
}

const debtsSyncHandler = {
    createDebtSync,
    updateDebtSync,
    deleteDebtSync,
    processSyncItem,
    syncAllPendingDebts,
};

export default debtsSyncHandler;