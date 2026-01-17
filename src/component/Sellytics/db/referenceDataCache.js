/**
 * Reference Data Cache - Customers & Products for Offline Support
 */
import db from './dexieDb';

// ==================== CUSTOMERS ====================

export const cacheCustomers = async (customers, storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid) || !customers?.length) return;

        // Clear existing customers for this store
        await db.customer.where('store_id').equals(sid).delete();

        // Cache new customers
        const customersToCache = customers.map(customer => ({
            id: customer.id,
            store_id: sid,
            fullname: customer.fullname,
            phone_number: customer.phone_number,
            email: customer.email,
            cached_at: new Date().toISOString(),
        }));

        await db.customer.bulkPut(customersToCache);
        console.log(`✅ Cached ${customersToCache.length} customers`);
    } catch (error) {
        console.error('Error caching customers:', error);
    }
};

export const getCachedCustomers = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return [];

        const customers = await db.customer.where('store_id').equals(sid).toArray();
        return customers;
    } catch (error) {
        console.error('Error getting cached customers:', error);
        return [];
    }
};

// ==================== PRODUCTS ====================

export const cacheProducts = async (products, storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid) || !products?.length) return;

        // Clear existing products for this store
        await db.dynamic_product.where('store_id').equals(sid).delete();

        // Cache new products
        const productsToCache = products.map(product => ({
            id: product.id,
            store_id: sid,
            name: product.name,
            selling_price: product.selling_price,
            dynamic_product_imeis: product.dynamic_product_imeis || '',
            device_size: product.device_size || '',
            device_id: product.device_id || '',
            is_unique: !!product.dynamic_product_imeis?.trim(),
            cached_at: new Date().toISOString(),
        }));

        await db.dynamic_product.bulkPut(productsToCache);
        console.log(`✅ Cached ${productsToCache.length} products`);
    } catch (error) {
        console.error('Error caching products:', error);
    }
};

export const getCachedProducts = async (storeId) => {
    try {
        const sid = Number(storeId);
        if (isNaN(sid)) return [];

        const products = await db.dynamic_product.where('store_id').equals(sid).toArray();
        return products;
    } catch (error) {
        console.error('Error getting cached products:', error);
        return [];
    }
};

// ==================== COMBINED FETCH WITH CACHE ====================

export const fetchAndCacheReferenceData = async (storeId, supabase) => {
    try {
        const [{ data: customers }, { data: products }] = await Promise.all([
            supabase
                .from('customer')
                .select('id, fullname, phone_number, email')
                .eq('store_id', storeId),
            supabase
                .from('dynamic_product')
                .select('id, name, selling_price, dynamic_product_imeis, device_size, device_id')
                .eq('store_id', storeId),
        ]);

        // Cache both
        await Promise.all([
            cacheCustomers(customers || [], storeId),
            cacheProducts(products || [], storeId),
        ]);

        return {
            customers: customers || [],
            products: products || [],
        };
    } catch (error) {
        console.error('Error fetching reference data:', error);

        // Fallback to cached data
        const [cachedCustomers, cachedProducts] = await Promise.all([
            getCachedCustomers(storeId),
            getCachedProducts(storeId),
        ]);

        return {
            customers: cachedCustomers,
            products: cachedProducts,
        };
    }
};