// src/components/Debts/EditDebtModal/EditDebtModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaSave } from 'react-icons/fa';
import { WifiOff, Plus } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import useDebt from './useDebt';
import ScannerModal from './ScannerModal';
import DebtEntry from './DebtEntry';
import useDebtEntryLogic from './useDebtEntryLogic';
import useScanner from './useScanner';
import { fetchAndCacheReferenceData, getCachedCustomers, getCachedProducts } from '../db/referenceDataCache';

// Modular components
import ModalHeader from './ModalHeader';
import ValidationAlert from './ValidationAlert';
import PaymentTracker from './PaymentTracker';

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
  payments: [],       // <-- always initialize as empty array
  date: new Date().toISOString().split('T')[0],
  isUniqueProduct: true,
};

export default function EditDebtModal({ initialData, onClose, onSuccess }) {
  const { addNotification } = useDebt();
  const storeId = localStorage.getItem('store_id');
  const isEdit = !!initialData?.id;

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const formRef = useRef(null);

  const {
    debtEntries,
    isLoading,
    handleChange,
    addDebtEntry,
    removeDebtEntry,
    handleScanSuccess,
    addDeviceRow,
    removeDeviceRow,
    saveDebts,
  } = useDebtEntryLogic({
    initialData,
    isEdit,
    storeId,
    customers,
    products,
    addNotification,
    onSuccess,
  });

  const scanner = useScanner({ onScanSuccess: handleScanSuccess });

  // Payment handlers
  const handleAddPayment = (entryIndex, payment) => {
    const updatedEntries = [...debtEntries];
    if (!Array.isArray(updatedEntries[entryIndex].payments)) {
      updatedEntries[entryIndex].payments = [];
    }
    updatedEntries[entryIndex].payments.push(payment);

    // Synchronize deposited field
    const currentDeposited = parseFloat(updatedEntries[entryIndex].deposited) || 0;
    const newTotal = (currentDeposited + payment.payment_amount).toFixed(2);

    handleChange(entryIndex, 'payments', updatedEntries[entryIndex].payments);
    handleChange(entryIndex, 'deposited', newTotal);
  };

  const handleRemovePayment = (entryIndex, paymentIndex) => {
    const updatedEntries = [...debtEntries];
    const removedPayment = updatedEntries[entryIndex].payments[paymentIndex];

    if (!Array.isArray(updatedEntries[entryIndex].payments)) {
      updatedEntries[entryIndex].payments = [];
    }
    updatedEntries[entryIndex].payments = updatedEntries[entryIndex].payments.filter(
      (_, idx) => idx !== paymentIndex
    );

    // Synchronize deposited field
    if (removedPayment) {
      const currentDeposited = parseFloat(updatedEntries[entryIndex].deposited) || 0;
      const newTotal = Math.max(0, currentDeposited - (removedPayment.payment_amount || 0)).toFixed(2);
      handleChange(entryIndex, 'deposited', newTotal);
    }

    handleChange(entryIndex, 'payments', updatedEntries[entryIndex].payments);
  };

  // Online/offline monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load customers/products
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        if (isOnline) {
          const { customers: fetchedCustomers, products: fetchedProducts } =
            await fetchAndCacheReferenceData(storeId, supabase);
          setCustomers(fetchedCustomers);
          setProducts(fetchedProducts);
        } else {
          const [cachedCustomers, cachedProducts] = await Promise.all([
            getCachedCustomers(storeId),
            getCachedProducts(storeId),
          ]);
          setCustomers(cachedCustomers);
          setProducts(cachedProducts);

          if (!cachedCustomers.length || !cachedProducts.length) {
            addNotification({
              type: 'warning',
              message: 'Limited data offline. Some features may be restricted.',
            });
          }
        }
      } catch (error) {
        console.error(error);
        const [cachedCustomers, cachedProducts] = await Promise.all([
          getCachedCustomers(storeId),
          getCachedProducts(storeId),
        ]);
        setCustomers(cachedCustomers);
        setProducts(cachedProducts);
        addNotification({
          type: 'error',
          message: 'Failed to load data. Using cached data.',
        });
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [storeId, isOnline, addNotification]);

  // Validation
  const validateAllEntries = () => {
    const errors = [];
    debtEntries.forEach((entry, index) => {
      const entryErrors = [];
      if (!entry.customer_id) entryErrors.push('Customer is required');
      if (!entry.dynamic_product_id) entryErrors.push('Product is required');
      if (!entry.qty || entry.qty < 1) entryErrors.push('Quantity must be at least 1');
      if (entry.owed === undefined || entry.owed === null || entry.owed === '' || entry.owed < 0) {
        entryErrors.push('Owed amount is required');
      }
      if (!entry.date) entryErrors.push('Date is required');
      if (entry.isUniqueProduct && entry.dynamic_product_id) {
        if (!entry.deviceIds || entry.deviceIds.length === 0 || entry.deviceIds.every(id => !id)) {
          entryErrors.push('At least one Product ID/IMEI is required for unique products');
        }
      }
      if (entryErrors.length) {
        errors.push({ entryIndex: index, entryNumber: index + 1, errors: entryErrors });
      }
    });
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateAllEntries();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationAlert(true);
      addNotification({
        type: 'error',
        message: `Please fill all required fields. ${errors.length} ${errors.length === 1 ? 'entry has' : 'entries have'} validation errors.`,
      });
      if (formRef.current) formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    setShowValidationAlert(false);
    saveDebts(); // persist debts
  };

  useEffect(() => {
    if (showValidationAlert) {
      const timer = setTimeout(() => setShowValidationAlert(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showValidationAlert]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <ModalHeader isEdit={isEdit} isOnline={isOnline} onClose={onClose} />

          {isLoadingData ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading data...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} ref={formRef} className="flex-1 overflow-y-auto p-5 space-y-6">
              {!isOnline && (!customers.length || !products.length) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Limited Offline Data</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        {!customers.length && 'No customers cached. '}
                        {!products.length && 'No products cached. '}
                        Connect to internet to access full data.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {showValidationAlert && (
                <ValidationAlert validationErrors={validationErrors} onDismiss={() => setShowValidationAlert(false)} />
              )}

              {debtEntries.map((entry, index) => (
                <div key={index} className="space-y-4">
                  <DebtEntry
                    entry={entry}
                    index={index}
                    customers={customers}
                    products={products}
                    isEdit={isEdit}
                    onChange={handleChange}
                    onRemove={removeDebtEntry}
                    onAddDeviceRow={() => addDeviceRow(index)}
                    onRemoveDevice={(entryIdx, deviceIdx) => removeDeviceRow(entryIdx, deviceIdx)}
                    onOpenScanner={(entryIdx, deviceIdx) => scanner.openScanner('camera', entryIdx ?? index, deviceIdx)}
                  />

                  <PaymentTracker
                    entry={entry}
                    index={index}
                    payments={entry.payments || []} // <-- safe fallback
                    isEdit={isEdit}
                    onAddPayment={(payment) => handleAddPayment(index, payment)}
                    onRemovePayment={(paymentIndex) => handleRemovePayment(index, paymentIndex)}
                    onOwedChange={(newOwed) => handleChange(index, 'owed', newOwed)}
                  />
                </div>
              ))}

              {!isEdit && (
                <button
                  type="button"
                  onClick={addDebtEntry}
                  className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Entry
                </button>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isLoadingData}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    'Saving...'
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      {isEdit ? 'Update Debt' : 'Save Debt'}
                      {!isOnline && ' (Offline)'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>

      <ScannerModal
        show={scanner.showScanner}
        scannerMode={scanner.scannerMode}
        setScannerMode={scanner.setScannerMode}
        continuousScan={scanner.continuousScan}
        setContinuousScan={scanner.setContinuousScan}
        manualInput={scanner.manualInput}
        setManualInput={scanner.setManualInput}
        onManualSubmit={scanner.handleManualSubmit}
        processScannedCode={scanner.processScannedCode}
        onClose={scanner.closeScanner}
      />
    </>
  );
}
