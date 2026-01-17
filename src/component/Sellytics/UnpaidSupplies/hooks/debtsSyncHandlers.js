import { supabase } from '../../../../supabaseClient';
import { markDebtSynced, markQueueItemSynced, markQueueItemFailed } from '../../db/debtsCache';
import { getCreatorMetadata } from '../../services/identityService';

/**
 * Handle debt creation sync
 */
export async function createDebtSync(item) {
    try {
        const metadata = getCreatorMetadata();
        const { data } = item;

        // Prevent duplicate online debts if needed (usually by checking _offline_id)
        const { data: existing } = await supabase
            .from('debts')
            .select('id')
            .eq('_offline_id', data._offline_id)
            .limit(1);

        if (existing?.length > 0) {
            await markDebtSynced(data._offline_id, existing[0].id);
            await markQueueItemSynced(item.client_ref);
            return { success: true, skipped: true };
        }

        // Insert into Supabase
        const { data: result, error } = await supabase
            .from('debts')
            .insert({
                ...data,
                ...metadata,
                id: undefined, // Let Supabase generate ID
                _offline_status: undefined,
                _synced: undefined,
                _sync_attempts: undefined,
                _client_ref: undefined,
                server_id: undefined,
            })
            .select()
            .single();

        if (error) throw error;

        await markDebtSynced(data._offline_id, result.id);
        await markQueueItemSynced(item.client_ref);
        return result;
    } catch (error) {
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
    try {
        const { data, entity_id } = item;

        const cleanData = { ...data };
        delete cleanData._offline_status;
        delete cleanData._synced;
        delete cleanData._offline_id;
        delete cleanData._client_ref;
        delete cleanData.server_id;
        delete cleanData.id;

        cleanData.updated_at = new Date().toISOString();

        const { data: result, error } = await supabase
            .from('debts')
            .update(cleanData)
            .eq('id', entity_id)
            .select()
            .single();

        if (error) throw error;

        await markQueueItemSynced(item.client_ref);
        return result;
    } catch (error) {
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
    try {
        const { entity_id } = item;

        const { error } = await supabase
            .from('debts')
            .delete()
            .eq('id', entity_id);

        if (error) throw error;

        await markQueueItemSynced(item.client_ref);
        return { success: true };
    } catch (error) {
        if (item?.client_ref) {
            await markQueueItemFailed(item.client_ref, error);
        }
        throw error;
    }
}