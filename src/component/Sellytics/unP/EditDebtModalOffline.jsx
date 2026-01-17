/**
 * EditDebtModalOffline - Debt Entry Modal with Offline Support
 * Creates/edits debts with local caching when offline
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaSave } from 'react-icons/fa';
import { X, AlertCircle, WifiOff } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import useDebtEntryLogic from './useDebtEntryLogic';
import useScanner from './hooks/useScanner';
import ScannerModal from './ScannerModal';
import DebtEntry from './DebtEntry';
import useDebtOffline from './hooks/useDebtOffline';
import toast from 'react-hot-toast';

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
    isUniqueProduct: true,
};

export default function EditDebtModalOffline({ initialData, onClose, onSuccess }) {
    const storeId = localStorage.getItem('store_id');
    const isEdit = !!initialData?.id;

    const { isOnline, createDebt, updateDebt } = useDebtOffline();

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [showValidationAlert, setShowValidationAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef(null);

    const {
        debtEntries,
        handleChange,
        addDebtEntry,
        removeDebtEntry,
        handleScanSuccess,
        addDeviceRow,
        removeDeviceRow,
        calculatedDebts,
    } = useDebtEntryLogic({
        initialData,
        isEdit,
        storeId,
        customers,
        products,
        addNotification: (msg, type) => {
            if (type === 'error') toast.error(msg);
            else if (type === 'success') toast.success(msg);
            else toast(msg);
        },
        onSuccess,
    });

    // Scanner hook
    const scanner = useScanner({
        onScanSuccess: handleScanSuccess
    });

    // Load customers and products
    useEffect(() => {
        const loadData = async () => {
            try {
                const [{ data: c }, { data: p }] = await Promise.all([
                    supabase
                        .from('customer')
                        .select('id, fullname, phone_number')
                        .eq('store_id', storeId),
                    supabase
                        .from('dynamic_product')
                        .select('id, name, dynamic_product_imeis, selling_price')
                        .eq('store_id', storeId),
                ]);
                setCustomers(c || []);
                setProducts(p || []);
            } catch (error) {
                console.error('Error loading data:', error);
                // If offline, try loading from local cache
                toast.error('Could not load data. Working offline.');
            }
        };
        loadData();
    }, [storeId]);

    // Validation function
    const validateAllEntries = () => {
        const errors = [];

        debtEntries.forEach((entry, index) => {
            const entryErrors = [];

            if (!entry.customer_id || entry.customer_id === '') {
                entryErrors.push('Customer is required');
            }

            if (!entry.dynamic_product_id || entry.dynamic_product_id === '') {
                entryErrors.push('Product is required');
            }

            if (!entry.qty || entry.qty < 1) {
                entryErrors.push('Quantity must be at least 1');
            }

            if (entry.owed === undefined || entry.owed === null || entry.owed === '' || entry.owed < 0) {
                entryErrors.push('Owed amount is required');
            }

            if (!entry.date) {
                entryErrors.push('Date is required');
            }

            if (entry.isUniqueProduct && entry.dynamic_product_id) {
                if (!entry.deviceIds || entry.deviceIds.length === 0 || entry.deviceIds.every(id => !id)) {
                    entryErrors.push('At least one device ID/IMEI is required for unique products');
                }
            }

            if (entryErrors.length > 0) {
                errors.push({
                    entryIndex: index,
                    entryNumber: index + 1,
                    errors: entryErrors
                });
            }
        });

        return errors;
    };

    // Handle form submission with offline support
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Run validation
        const errors = validateAllEntries();

        if (errors.length > 0) {
            setValidationErrors(errors);
            setShowValidationAlert(true);
            toast.error(`Please fill in all required fields. ${errors.length} ${errors.length === 1 ? 'entry has' : 'entries have'} validation errors.`);

            if (formRef.current) {
                formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        setValidationErrors([]);
        setShowValidationAlert(false);
        setIsLoading(true);

        let successCount = 0;
        let errorCount = 0;

        try {
            for (const entry of calculatedDebts) {
                const payload = {
                    store_id: Number(storeId),
                    customer_id: parseInt(entry.customer_id),
                    dynamic_product_id: parseInt(entry.dynamic_product_id),
                    customer_name: entry.customer_name,
                    product_name: entry.product_name,
                    supplier: entry.supplier || null,
                    device_id: entry.deviceIds ? entry.deviceIds.filter(Boolean).join(', ') : '',
                    device_sizes: entry.deviceSizes ? entry.deviceSizes.filter(Boolean).join(', ') : '',
                    qty: entry.isUniqueProduct
                        ? (entry.deviceIds ? entry.deviceIds.filter(Boolean).length : 1)
                        : (entry.qty || 1),
                    owed: parseFloat(entry.owed),
                    deposited: parseFloat(entry.deposited || 0),
                    remaining_balance: parseFloat(entry.remaining_balance),
                    date: entry.date,
                    is_paid: parseFloat(entry.remaining_balance) <= 0,
                };

                try {
                    if (isEdit) {
                        await updateDebt(initialData.id, payload);
                    } else {
                        await createDebt(payload);
                    }
                    successCount++;
                } catch (err) {
                    console.error('Save error:', err);
                    errorCount++;
                }
            }
        } catch (error) {
            console.error('Save debts error:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }

        // Show result
        if (successCount > 0) {
            const message = isEdit
                ? `✅ Debt updated${!isOnline ? ' (offline)' : ''}!`
                : `✅ ${successCount} debt${successCount > 1 ? 's' : ''} saved${!isOnline ? ' (offline)' : ''}!`;

            toast.success(message, {
                duration: 3000,
                style: {
                    background: isOnline ? '#10B981' : '#F59E0B',
                    color: '#FFFFFF',
                },
            });
            onSuccess?.();
        } else if (errorCount > 0) {
            toast.error('❌ No debts were saved. Please check the form.');
        }
    };

    // Auto-hide validation alert
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
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <FaPlus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {isEdit ? '📝 Edit Debt Entry' : 'Record New Debt'}
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {isEdit
                                        ? 'Update existing debt entries'
                                        : 'Add new debt entries for customers'}
                                    {!isOnline && (
                                        <span className="flex items-center gap-1 text-amber-600">
                                            <WifiOff className="w-3 h-3" />
                                            Offline
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        ref={formRef}
                        className="flex-1 overflow-y-auto p-5 space-y-6"
                    >
                        {/* Offline Notice */}
                        {!isOnline && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3"
                            >
                                <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                <div>
                                    <p className="font-medium text-amber-800 dark:text-amber-200">Working Offline</p>
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        Changes will be saved locally and synced when back online.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Validation Alert */}
                        <AnimatePresence>
                            {showValidationAlert && validationErrors.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-800 rounded-xl p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
                                                ⚠️ Validation Errors
                                            </h3>
                                            <div className="space-y-2">
                                                {validationErrors.map((error, idx) => (
                                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-red-200 dark:border-red-700">
                                                        <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                                                            Entry {error.entryNumber}:
                                                        </h4>
                                                        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                                                            {error.errors.map((err, errIdx) => (
                                                                <li key={errIdx}>• {err}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Debt Entries */}
                        {debtEntries.map((entry, index) => (
                            <DebtEntry
                                key={index}
                                entry={entry}
                                index={index}
                                customers={customers}
                                products={products}
                                isEdit={isEdit}
                                onChange={handleChange}
                                onRemove={removeDebtEntry}
                                onAddDeviceRow={() => addDeviceRow(index)}
                                onRemoveDevice={(entryIdx, deviceIdx) => removeDeviceRow(entryIdx, deviceIdx)}
                                onOpenScanner={(entryIdx, deviceIdx) => {
                                    scanner.openScanner('camera', entryIdx !== undefined ? entryIdx : index, deviceIdx);
                                }}
                            />
                        ))}

                        {!isEdit && (
                            <button
                                type="button"
                                onClick={addDebtEntry}
                                className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                                <FaPlus className="w-4 h-4" />
                                Add Another Entry
                            </button>
                        )}

                        {/* Footer */}
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
                                disabled={isLoading}
                                className={`
                  flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all
                  ${isOnline
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                                    }
                  text-white disabled:opacity-50 disabled:cursor-not-allowed
                `}
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
                </motion.div>
            </motion.div>

            {/* Scanner Modal */}
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