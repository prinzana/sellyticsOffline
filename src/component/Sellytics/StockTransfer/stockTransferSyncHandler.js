/**
 * Stock Transfer Sync Handler
 * Handles syncing offline stock transfers to Supabase
 */
import { supabase } from '../../../supabaseClient';
import { markTransferSynced, markTransferFailed } from './stockTransferCache';

/**
 * Handle stock transfer creation sync
 * Performs the multi-step inventory movement in Supabase
 */
export async function syncTransfer(item) {
    const { data } = item;

    try {
        const quantity = Number(data.quantity);
        const sourceStoreId = data.source_store_id;
        const destination = data.destination_store_id;
        const productId = data.dynamic_product_id;
        const ownerId = data.store_owner_id;

        // 1. Get source product details for dest creation if needed
        const { data: sourceProduct, error: sourceProdErr } = await supabase
            .from('dynamic_product')
            .select('*')
            .eq('id', productId)
            .single();

        if (sourceProdErr) throw sourceProdErr;
        const productName = sourceProduct.name;

        // 2. DEDUCT SOURCE (Supabase)
        // We fetch current qty first to avoid race conditions if possible, 
        // or use a RPC. For now, following existing logic pattern.
        const { data: sourceInv, error: sourceInvErr } = await supabase
            .from('dynamic_inventory')
            .select('available_qty, quantity')
            .eq('store_id', sourceStoreId)
            .eq('dynamic_product_id', productId)
            .single();

        if (sourceInvErr) throw sourceInvErr;

        const { error: deductError } = await supabase
            .from('dynamic_inventory')
            .update({
                available_qty: sourceInv.available_qty - quantity,
                quantity: sourceInv.quantity - quantity,
                updated_at: new Date(),
            })
            .eq('store_id', sourceStoreId)
            .eq('dynamic_product_id', productId);

        if (deductError) throw deductError;

        // 3. CHECK DESTINATION PRODUCT
        const { data: destProduct, error: prodErr } = await supabase
            .from('dynamic_product')
            .select('*')
            .eq('store_id', destination)
            .eq('name', productName)
            .maybeSingle();

        if (prodErr) throw prodErr;

        let destProductId;

        if (destProduct) {
            destProductId = destProduct.id;
            // Update destination product fields
            await supabase
                .from('dynamic_product')
                .update({
                    description: sourceProduct.description,
                    purchase_price: sourceProduct.purchase_price,
                    markup_percent: sourceProduct.markup_percent,
                    selling_price: sourceProduct.selling_price,
                    suppliers_name: sourceProduct.suppliers_name,
                    device_id: sourceProduct.device_id,
                    dynamic_product_imeis: sourceProduct.dynamic_product_imeis,
                    device_size: sourceProduct.device_size,
                })
                .eq('id', destProductId);

            // Update or Create Inventory
            const { data: destInventory, error: invErr } = await supabase
                .from('dynamic_inventory')
                .select('available_qty, quantity')
                .eq('store_id', destination)
                .eq('dynamic_product_id', destProductId)
                .maybeSingle();

            if (invErr) throw invErr;

            if (!destInventory) {
                await supabase.from('dynamic_inventory').insert({
                    dynamic_product_id: destProductId,
                    store_id: destination,
                    quantity: quantity,
                    available_qty: quantity,
                    store_owner_id: ownerId,
                    last_updated: new Date(),
                    updated_at: new Date(),
                });
            } else {
                await supabase.from('dynamic_inventory').update({
                    available_qty: destInventory.available_qty + quantity,
                    quantity: destInventory.quantity + quantity,
                    updated_at: new Date(),
                }).eq('store_id', destination).eq('dynamic_product_id', destProductId);
            }
        } else {
            // Create Product and Inventory
            const { data: newProduct, error: createErr } = await supabase
                .from('dynamic_product')
                .insert({
                    store_id: destination,
                    name: productName,
                    description: sourceProduct.description,
                    purchase_price: sourceProduct.purchase_price,
                    markup_percent: sourceProduct.markup_percent,
                    selling_price: sourceProduct.selling_price,
                    suppliers_name: sourceProduct.suppliers_name,
                    device_id: sourceProduct.device_id,
                    dynamic_product_imeis: sourceProduct.dynamic_product_imeis,
                    device_size: sourceProduct.device_size,
                    owner_id: ownerId,
                    purchase_qty: quantity,
                })
                .select()
                .single();

            if (createErr) throw createErr;
            destProductId = newProduct.id;

            await supabase.from('dynamic_inventory').insert({
                dynamic_product_id: destProductId,
                store_id: destination,
                quantity: quantity,
                available_qty: quantity,
                store_owner_id: ownerId,
                last_updated: new Date(),
                updated_at: new Date(),
            });
        }

        // 4. LOG TRANSFER
        const { data: result, error: logErr } = await supabase
            .from('stock_transfer_requests')
            .insert({
                source_store_id: sourceStoreId,
                destination_store_id: destination,
                dynamic_product_id: productId,
                quantity: quantity,
                store_owner_id: ownerId,
                status: 'APPROVED',
                requested_at: data.requested_at || new Date(),
            })
            .select()
            .single();

        if (logErr) throw logErr;

        // 5. Success - mark local and queue
        await markTransferSynced(data._offline_id, result.id);

        return { success: true, id: result.id };
    } catch (error) {
        console.error('❌ Transfer sync failed:', error);
        await markTransferFailed(data._offline_id, error.message);
        throw error;
    }
}
