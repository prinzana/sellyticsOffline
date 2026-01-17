/**
 * Stock Transfer Cache
 * Standardized offline-first logic for stock transfers
 */
import db from '../db/dexieDb';
import {
    generateOfflineId,
    generateClientRef,
    timestamp,
} from '../utils';

/**
 * Creates an offline stock transfer and queues it for sync.
 * Optimistically updates the source store's inventory.
 */
export const createOfflineTransfer = async (transferData) => {
    const {
        source_store_id,
        destination_store_id,
        dynamic_product_id,
        quantity,
        store_owner_id,
        product_name,
    } = transferData;

    const offlineId = generateOfflineId();
    const clientRef = generateClientRef();

    const transfer = {
        source_store_id: Number(source_store_id),
        destination_store_id: Number(destination_store_id),
        dynamic_product_id: Number(dynamic_product_id),
        quantity: Number(quantity),
        store_owner_id,
        product_name,
        status: 'PENDING',
        requested_at: timestamp(),
        _offline_id: offlineId,
        _client_ref: clientRef,
        _offline_status: 'pending',
        _synced: 0,
    };

    // 1. Save locally
    const localId = await db.stock_transfers.add(transfer);

    // 2. Optimistic Update (Source Store)
    const inventoryItem = await db.dynamic_inventory
        .where({
            store_id: Number(source_store_id),
            dynamic_product_id: Number(dynamic_product_id)
        })
        .first();

    if (inventoryItem) {
        await db.dynamic_inventory.update(inventoryItem.id, {
            available_qty: inventoryItem.available_qty - quantity,
            quantity: inventoryItem.quantity - quantity,
            updated_at: timestamp(),
            _offline_status: 'pending_update',
        });
    }

    // 3. Queue for synchronization
    await db.offline_queue.add({
        entity_type: 'stock_transfers',
        operation: 'create',
        entity_id: offlineId,
        store_id: Number(source_store_id),
        data: { ...transfer, id: localId },
        status: 'pending',
        priority: 1,
        sync_attempts: 0,
        client_ref: clientRef,
        created_at: timestamp(),
    });

    // 4. Local Notification
    if (db.notifications) {
        await db.notifications.add({
            store_id: Number(source_store_id),
            type: 'stock_transfer_created_offline',
            message: `Stock transfer for ${quantity} x ${product_name} saved locally.`,
            read: false,
            dismissed: false,
            created_at: timestamp()
        });
    }

    return { ...transfer, id: localId };
};

export const getPendingTransfersCount = async (storeId) => {
    const sid = Number(storeId);
    if (isNaN(sid)) return 0;
    return db.stock_transfers
        .where('[source_store_id+_synced]')
        .equals([sid, 0])
        .count();
};

export const getAllTransfers = async (storeId) => {
    const sid = Number(storeId);
    if (isNaN(sid)) return [];
    return db.stock_transfers
        .where('source_store_id')
        .equals(sid)
        .reverse()
        .sortBy('requested_at');
};

export const markTransferSynced = async (offlineId, serverId) => {
    const transfer = await db.stock_transfers.where('_offline_id').equals(offlineId).first();
    if (transfer) {
        await db.stock_transfers.update(transfer.id, {
            id: serverId || transfer.id,
            _synced: 1,
            _offline_status: 'synced',
            status: 'APPROVED'
        });

        await db.offline_queue
            .where('entity_id')
            .equals(offlineId)
            .modify({ status: 'synced', updated_at: timestamp() });
    }
};

export const markTransferFailed = async (offlineId, error) => {
    await db.stock_transfers
        .where('_offline_id')
        .equals(offlineId)
        .modify({ _offline_status: 'failed', error_message: error });

    await db.offline_queue
        .where('entity_id')
        .equals(offlineId)
        .modify({ status: 'failed', updated_at: timestamp() });
};
