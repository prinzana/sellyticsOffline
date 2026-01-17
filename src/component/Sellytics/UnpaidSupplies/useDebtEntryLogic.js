import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import { createDebtOffline, updateDebtOffline } from '../db/debtsCache';

// Default entry shape - export for reuse
export const defaultEntry = {
  customer_id: '',
  customer_name: '',
  phone_number: '',
  dynamic_product_id: '',
  product_name: '',
  supplier: '',
  deviceIds: [''],
  deviceSizes: [''],
  qty: 1,
  owed: '',
  deposited: 0,
  date: new Date().toISOString().split('T')[0],
  isUniqueProduct: false,
};

/**
 * Check if a Product ID already exists (already sold or in debts)
 */
const checkDeviceIdExists = async (deviceId, storeId, excludeDebtId = null) => {
  try {
    const cleanId = deviceId.trim().toLowerCase();

    // Check 1: Already sold in dynamic_sales
    const { data: salesData, error: salesError } = await supabase
      .from('dynamic_sales')
      .select('id, customer_name, device_id, dynamic_product_imeis')
      .eq('store_id', storeId)
      .eq('status', 'sold');

    if (salesError) {
      console.error('Error checking sales:', salesError);
    } else if (salesData) {
      const soldItem = salesData.find(sale => {
        if (sale.device_id?.toLowerCase() === cleanId) return true;
        const imeis = (sale.dynamic_product_imeis || '').split(',').map(id => id.trim().toLowerCase());
        return imeis.includes(cleanId);
      });

      if (soldItem) {
        return {
          found: true,
          type: 'sold',
          customer: soldItem.customer_name
        };
      }
    }

    // Check 2: Already in debts table
    let debtQuery = supabase
      .from('debts')
      .select('id, customer_name, product_name, device_id')
      .eq('store_id', storeId);

    if (excludeDebtId) {
      debtQuery = debtQuery.neq('id', excludeDebtId);
    }

    const { data: debtsData, error: debtsError } = await debtQuery;

    if (debtsError) {
      console.error('Error checking debts:', debtsError);
    } else if (debtsData) {
      const debtItem = debtsData.find(debt => {
        const ids = (debt.device_id || '').split(',').map(id => id.trim().toLowerCase());
        return ids.includes(cleanId);
      });

      if (debtItem) {
        return {
          found: true,
          type: 'debt',
          customer: debtItem.customer_name
        };
      }
    }

    return { found: false };
  } catch (err) {
    console.error('Error in checkDeviceIdExists:', err);
    return { found: false };
  }
};

/**
 * Validate if scanned IMEI belongs to the selected product
 */
const validateImeiForProduct = (scannedImei, product) => {
  if (!product?.dynamic_product_imeis) {
    return { valid: false, reason: 'Product has no IMEIs' };
  }

  const productImeis = product.dynamic_product_imeis
    .split(',')
    .map(imei => imei.trim().toLowerCase())
    .filter(Boolean);

  const scannedLower = scannedImei.trim().toLowerCase();

  if (!productImeis.includes(scannedLower)) {
    return {
      valid: false,
      reason: `IMEI not found in ${product.name || 'this product'}`
    };
  }

  return { valid: true };
};

export default function useDebtEntryLogic({
  initialData,
  isEdit,
  storeId,
  customers,
  products,
  addNotification,
  onSuccess,
}) {
  const [debtEntries, setDebtEntries] = useState([{
    ...defaultEntry,
    isUniqueProduct: false,
  }]);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isEdit && initialData) {
      const hasImeis = initialData.device_id?.trim() !== '';
      setDebtEntries([{
        ...defaultEntry,
        ...initialData,
        customer_id: initialData.customer_id || '',
        dynamic_product_id: initialData.dynamic_product_id || '',
        deviceIds: initialData.device_id
          ? initialData.device_id.split(',').map(s => s.trim()).filter(Boolean)
          : [''],
        deviceSizes: initialData.device_sizes
          ? initialData.device_sizes.split(',').map(s => s.trim()).filter(Boolean)
          : [''],
        qty: initialData.qty || 1,
        owed: initialData.owed || '',
        deposited: initialData.deposited || 0,
        date: initialData.date
          ? initialData.date.split('T')[0]
          : new Date().toISOString().split('T')[0],
        isUniqueProduct: hasImeis,
      }]);
    } else {
      setDebtEntries([defaultEntry]);
    }
  }, [initialData, isEdit]);

  // Derived calculations
  const calculatedDebts = useMemo(() => {
    return debtEntries.map(entry => {
      const owed = parseFloat(entry.owed) || 0;
      const deposited = parseFloat(entry.deposited) || 0;
      return {
        ...entry,
        remaining_balance: (owed - deposited).toFixed(2),
        deviceIds: Array.isArray(entry.deviceIds) ? entry.deviceIds : [''],
        deviceSizes: Array.isArray(entry.deviceSizes) ? entry.deviceSizes : [''],
      };
    });
  }, [debtEntries]);

  const handleChange = (index, field, value) => {
    setDebtEntries(prev =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const newEntry = { ...entry };

        if (field === 'customer_id') {
          newEntry.customer_id = value;
          const cust = customers.find(c => c.id === parseInt(value));
          newEntry.customer_name = cust?.fullname || '';
        }

        else if (field === 'dynamic_product_id') {
          newEntry.dynamic_product_id = value;
          const prod = products.find(p => p.id === parseInt(value));
          if (prod) {
            newEntry.product_name = prod.name;
            const price = parseFloat(prod.selling_price) || 0;
            const isUnique = !!prod.dynamic_product_imeis?.trim();
            newEntry.isUniqueProduct = isUnique;

            if (isUnique) {
              newEntry.deviceIds = Array.isArray(newEntry.deviceIds) ? newEntry.deviceIds : [''];
              newEntry.deviceSizes = Array.isArray(newEntry.deviceSizes) ? newEntry.deviceSizes : [''];
              newEntry.qty = newEntry.deviceIds.filter(Boolean).length || 1;
              newEntry.owed = (price * newEntry.qty).toFixed(2);
            } else {
              newEntry.deviceIds = [''];
              newEntry.deviceSizes = [''];
              newEntry.qty = newEntry.qty || 1;
              newEntry.owed = (newEntry.qty * price).toFixed(2);
            }
          }
        }

        else if (field === 'qty') {
          const qty = parseFloat(value) || 1;
          if (newEntry.isUniqueProduct) {
            addNotification('Quantity for unique products is determined by Product IDs.', 'warning');
            return newEntry;
          }
          newEntry.qty = qty;
          const prod = products.find(p => p.id === parseInt(newEntry.dynamic_product_id));
          if (prod) newEntry.owed = (qty * parseFloat(prod.selling_price || 0)).toFixed(2);
        }

        else if (field === 'deviceId') {
          const { deviceIndex, value: deviceValue } = value;
          newEntry.deviceIds = Array.isArray(newEntry.deviceIds) ? [...newEntry.deviceIds] : [''];
          newEntry.deviceIds[deviceIndex] = deviceValue;
          newEntry.qty = newEntry.deviceIds.filter(Boolean).length || 1;
          const prod = products.find(p => p.id === parseInt(newEntry.dynamic_product_id));
          if (prod) newEntry.owed = (parseFloat(prod.selling_price || 0) * newEntry.qty).toFixed(2);
        }

        else if (field === 'deviceSize') {
          const { deviceIndex, value: sizeValue } = value;
          newEntry.deviceSizes = Array.isArray(newEntry.deviceSizes) ? [...newEntry.deviceSizes] : [''];
          newEntry.deviceSizes[deviceIndex] = sizeValue;
        }

        else {
          newEntry[field] = value;
        }

        return newEntry;
      })
    );
  };

  const addDebtEntry = () => {
    if (!isEdit) setDebtEntries(prev => [...prev, {
      ...defaultEntry,
      isUniqueProduct: false,
    }]);
  };

  const removeDebtEntry = index => {
    if (!isEdit && debtEntries.length > 1) setDebtEntries(prev => prev.filter((_, i) => i !== index));
  };

  const addDeviceRow = entryIndex => {
    setDebtEntries(prev => {
      const updated = [...prev];
      const current = { ...updated[entryIndex] };
      current.deviceIds = Array.isArray(current.deviceIds) ? [...current.deviceIds, ''] : [''];
      current.deviceSizes = Array.isArray(current.deviceSizes) ? [...current.deviceSizes, ''] : [''];
      updated[entryIndex] = current;
      return updated;
    });
  };

  const removeDeviceRow = (entryIndex, deviceIndex) => {
    setDebtEntries(prev => {
      const updated = [...prev];
      const current = { ...updated[entryIndex] };
      current.deviceIds = Array.isArray(current.deviceIds) ? current.deviceIds.filter((_, i) => i !== deviceIndex) : [''];
      current.deviceSizes = Array.isArray(current.deviceSizes) ? current.deviceSizes.filter((_, i) => i !== deviceIndex) : [''];
      if (!current.deviceIds.length) {
        current.deviceIds = [''];
        current.deviceSizes = [''];
      }
      const prod = products.find(p => p.id === parseInt(current.dynamic_product_id));
      const price = prod ? parseFloat(prod.selling_price || 0) : 0;
      current.qty = current.deviceIds.filter(Boolean).length || 1;
      current.owed = (price * current.qty).toFixed(2);
      updated[entryIndex] = current;
      return updated;
    });
  };

  // Find product by barcode/IMEI
  const findProductByBarcode = async (barcode) => {
    try {
      const { data, error } = await supabase
        .from('dynamic_product')
        .select('id, name, selling_price, dynamic_product_imeis, device_size')
        .eq('store_id', storeId)
        .ilike('dynamic_product_imeis', `%${barcode}%`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error finding product:', error);
        return null;
      }

      if (!data) {
        const { data: altData } = await supabase
          .from('dynamic_product')
          .select('id, name, selling_price, device_id')
          .eq('store_id', storeId)
          .eq('device_id', barcode)
          .limit(1)
          .maybeSingle();

        return altData || null;
      }

      return data;
    } catch (err) {
      console.error('Error in findProductByBarcode:', err);
      return null;
    }
  };

  const handleScanSuccess = async (code, entryIndex, deviceIndex) => {
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Invalid barcode' };
    }
    const cleanCode = code.trim();
    if (!cleanCode) {
      return { success: false, error: 'Empty barcode' };
    }

    // CASE 1: No entry specified - find product and create new entry
    if (entryIndex === null || entryIndex === undefined) {
      const product = await findProductByBarcode(cleanCode);

      if (!product) {
        return { success: false, error: `Product not found for: ${cleanCode}` };
      }

      const existingCheck = await checkDeviceIdExists(cleanCode, storeId, isEdit ? initialData?.id : null);
      if (existingCheck.found) {
        if (existingCheck.type === 'sold') {
          return {
            success: false,
            error: `Already sold to ${existingCheck.customer || 'a customer'}`
          };
        } else {
          return {
            success: false,
            error: `Already in debt for ${existingCheck.customer || 'a customer'}`
          };
        }
      }

      const isUnique = !!product.dynamic_product_imeis?.trim();
      const price = parseFloat(product.selling_price || 0);

      let deviceSize = '';
      if (isUnique && product.dynamic_product_imeis) {
        const deviceImeis = product.dynamic_product_imeis.split(',').map(i => i.trim());
        const deviceSizes = (product.device_size || '').split(',').map(s => s.trim());
        const deviceIdx = deviceImeis.findIndex(id => id.toLowerCase() === cleanCode.toLowerCase());
        deviceSize = deviceIdx >= 0 ? (deviceSizes[deviceIdx] || '') : '';
      }

      const newEntry = {
        ...defaultEntry,
        dynamic_product_id: product.id.toString(),
        product_name: product.name,
        isUniqueProduct: isUnique,
        deviceIds: isUnique ? [cleanCode] : [''],
        deviceSizes: isUnique ? [deviceSize] : [''],
        qty: isUnique ? 1 : 1,
        owed: price.toFixed(2),
      };

      setDebtEntries(prev => [...prev, newEntry]);
      return {
        success: true,
        productName: product.name
      };
    }

    // CASE 2: Entry specified - add Product ID to existing entry
    const currentEntry = debtEntries[entryIndex];
    if (!currentEntry) {
      return { success: false, error: 'Entry not found' };
    }

    // SUB-CASE 2A: No product selected yet - find product by scanned IMEI
    if (!currentEntry.dynamic_product_id) {
      const product = await findProductByBarcode(cleanCode);

      if (!product) {
        return { success: false, error: `Product not found for: ${cleanCode}` };
      }

      const existingCheck = await checkDeviceIdExists(cleanCode, storeId, isEdit ? initialData?.id : null);
      if (existingCheck.found) {
        if (existingCheck.type === 'sold') {
          return {
            success: false,
            error: `Already sold to ${existingCheck.customer || 'a customer'}`
          };
        } else {
          return {
            success: false,
            error: `Already in debt for ${existingCheck.customer || 'a customer'}`
          };
        }
      }

      const isUnique = !!product.dynamic_product_imeis?.trim();
      const price = parseFloat(product.selling_price || 0);

      let deviceSize = '';
      if (isUnique && product.dynamic_product_imeis) {
        const deviceImeis = product.dynamic_product_imeis.split(',').map(i => i.trim());
        const deviceSizes = (product.device_size || '').split(',').map(s => s.trim());
        const deviceIdx = deviceImeis.findIndex(id => id.toLowerCase() === cleanCode.toLowerCase());
        deviceSize = deviceIdx >= 0 ? (deviceSizes[deviceIdx] || '') : '';
      }

      setDebtEntries(prev => {
        const updated = [...prev];
        updated[entryIndex] = {
          ...updated[entryIndex],
          dynamic_product_id: product.id.toString(),
          product_name: product.name,
          isUniqueProduct: isUnique,
          deviceIds: isUnique ? [cleanCode] : [''],
          deviceSizes: isUnique ? [deviceSize] : [''],
          qty: isUnique ? 1 : 1,
          owed: price.toFixed(2),
        };
        return updated;
      });

      return {
        success: true,
        productName: product.name
      };
    }

    // SUB-CASE 2B: Product already selected - add Product ID to existing product
    const product = products.find(p => p.id === parseInt(currentEntry.dynamic_product_id));
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    if (!product.dynamic_product_imeis?.trim()) {
      return {
        success: false,
        error: 'This product does not use Product IDs'
      };
    }

    const validation = validateImeiForProduct(cleanCode, product);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason
      };
    }

    const existingIds = Array.isArray(currentEntry.deviceIds)
      ? currentEntry.deviceIds.map(id => id.toLowerCase())
      : [];

    if (existingIds.includes(cleanCode.toLowerCase())) {
      return {
        success: false,
        error: `Product ID "${cleanCode}" already added to this entry`
      };
    }

    const existingCheck = await checkDeviceIdExists(cleanCode, storeId, isEdit ? initialData?.id : null);
    if (existingCheck.found) {
      if (existingCheck.type === 'sold') {
        return {
          success: false,
          error: `Already sold to ${existingCheck.customer || 'a customer'}`
        };
      } else {
        return {
          success: false,
          error: `Already in debt for ${existingCheck.customer || 'a customer'}`
        };
      }
    }

    let deviceSize = '';
    const deviceImeis = product.dynamic_product_imeis.split(',').map(i => i.trim());
    const deviceSizes = (product.device_size || '').split(',').map(s => s.trim());
    const deviceIdx = deviceImeis.findIndex(id => id.toLowerCase() === cleanCode.toLowerCase());
    deviceSize = deviceIdx >= 0 ? (deviceSizes[deviceIdx] || '') : '';

    setDebtEntries(prev => {
      const updated = [...prev];
      const current = { ...updated[entryIndex] };

      current.deviceIds = Array.isArray(current.deviceIds) ? [...current.deviceIds] : [];
      current.deviceSizes = Array.isArray(current.deviceSizes) ? [...current.deviceSizes] : [];

      if (deviceIndex !== null && deviceIndex !== undefined && deviceIndex < current.deviceIds.length) {
        current.deviceIds[deviceIndex] = cleanCode;
        if (deviceSize) {
          current.deviceSizes[deviceIndex] = deviceSize;
        }
      } else {
        current.deviceIds.push(cleanCode);
        current.deviceSizes.push(deviceSize);
      }

      const price = parseFloat(product.selling_price || 0);
      current.qty = current.deviceIds.filter(Boolean).length || 1;
      current.owed = (price * current.qty).toFixed(2);

      updated[entryIndex] = current;
      return updated;
    });

    return {
      success: true,
      productName: product.name
    };
  };


  // src/hooks/useDebtEntryLogic.js
  const saveDebts = async () => {
    setIsLoading(true);
    const isOnline = navigator.onLine;

    try {
      for (const entry of debtEntries) {
        // Ensure deposited is always sum of payments

        const dataToSave = {
          customer_id: entry.customer_id,
          customer_name: entry.customer_name,
          phone_number: entry.phone_number || '',
          dynamic_product_id: entry.dynamic_product_id,
          product_name: entry.product_name,
          supplier: entry.supplier || '',
          device_id: entry.deviceIds.filter(Boolean).join(','),
          device_sizes: entry.deviceSizes.filter(Boolean).join(','),
          qty: entry.qty,
          owed: parseFloat(entry.owed) || 0,      // <-- persist edited owed
          deposited: parseFloat(entry.deposited) || 0, // <-- use actual deposited field
          payments: entry.payments || [],         // <-- persist payments
          date: entry.date,
          updated_at: new Date().toISOString(),
        };

        if (isEdit) {
          if (isOnline) {
            const { error } = await supabase
              .from('debts')
              .update(dataToSave)
              .eq('id', entry.id); // <-- make sure entry.id exists

            if (error) throw error;
            toast.success('Debt updated successfully!');
          } else {
            await updateDebtOffline(entry.id, dataToSave, storeId);
            toast.success('Debt updated offline. Will sync when online.');
          }
        } else {
          // NEW debt
          const insertData = { ...dataToSave, store_id: storeId, created_at: new Date().toISOString() };
          if (isOnline) {
            const { error } = await supabase.from('debts').insert(insertData);
            if (error) throw error;
            toast.success('Debt recorded successfully!');
          } else {
            await createDebtOffline(insertData, storeId);
            toast.success('Debt saved offline. Will sync when online.');
          }
        }
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving debts:', error);
      toast.error(error.message || 'Failed to save debts');
    } finally {
      setIsLoading(false);
    }
  };


  return {
    debtEntries,
    isLoading,
    calculatedDebts,
    handleChange,
    addDebtEntry,
    removeDebtEntry,
    addDeviceRow,
    removeDeviceRow,
    handleScanSuccess,
    saveDebts,
    setIsLoading,
  };
}