/**
 * useDebtWithOffline - Integrates offline support with existing useDebt logic
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import useDebtOffline from './useDebtOffline';
import toast from 'react-hot-toast';

export default function useDebtWithOffline() {

    const {
        debts,
        isLoading,
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncTime,
        syncError,
        fetchDebts,
        createDebt,
        updateDebt,
        deleteDebt,
        performSync,
        updatePendingCount,
    } = useDebtOffline();

    const [filteredDebts, setFilteredDebts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editing, setEditing] = useState(null);
    const [showDetail, setShowDetail] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerCallback, setScannerCallback] = useState(null);
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);

        if (type === 'success') toast.success(message, { duration: 2000 });
        else if (type === 'error') toast.error(message, { duration: 3000 });
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredDebts(debts);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = debts.filter(d =>
            [d.customer_name, d.product_name, d.phone_number, ...(d.deviceIds || [])]
                .some(field => field?.toLowerCase().includes(term))
        );
        setFilteredDebts(filtered);
    }, [searchTerm, debts]);

    const createDebtWithNotification = useCallback(async (debtData) => {
        try {
            const result = await createDebt(debtData);
            addNotification('Debt created successfully', 'success');
            return result;
        } catch (error) {
            addNotification(`Failed to create debt: ${error.message}`, 'error');
            throw error;
        }
    }, [createDebt, addNotification]);

    const updateDebtWithNotification = useCallback(async (debtId, updates) => {
        try {
            const result = await updateDebt(debtId, updates);
            addNotification('Debt updated successfully', 'success');
            return result;
        } catch (error) {
            addNotification(`Failed to update debt: ${error.message}`, 'error');
            throw error;
        }
    }, [updateDebt, addNotification]);

    const deleteDebtFromDatabase = useCallback(async (debtId) => {
        if (!debtId) {
            addNotification('Invalid debt ID', 'error');
            return;
        }
        try {
            await deleteDebt(debtId);
            addNotification('Debt deleted successfully', 'success');
            return { success: true };
        } catch (error) {
            addNotification(`Failed to delete debt: ${error.message}`, 'error');
            throw error;
        }
    }, [deleteDebt, addNotification]);

    const openScanner = useCallback((onSuccessCallback) => {
        if (typeof onSuccessCallback !== 'function') {
            addNotification('Scanner error: invalid callback', 'error');
            return;
        }
        setScannerCallback(() => onSuccessCallback);
        setShowScanner(true);
    }, [addNotification]);

    const closeScanner = useCallback(() => {
        setShowScanner(false);
        setScannerCallback(null);
    }, []);

    const handleScanSuccess = useCallback((code) => {
        if (scannerCallback) scannerCallback(code.trim());
        closeScanner();
        addNotification(`Scanned: ${code.trim()}`, 'success');
    }, [scannerCallback, closeScanner, addNotification]);

    const stats = useMemo(() => {
        const total = debts.length;
        const paid = debts.filter(d => (d.owed || 0) - (d.deposited || 0) <= 0).length;
        const unpaid = total - paid;
        const totalOwed = debts.reduce((sum, d) => sum + (d.owed || 0), 0);
        const totalPaid = debts.reduce((sum, d) => sum + (d.deposited || 0), 0);
        const totalBalance = totalOwed - totalPaid;
        const pendingSync = debts.filter(d => d._offline_status === 'pending').length;

        return { total, paid, unpaid, totalOwed, totalPaid, totalBalance, pendingSync };
    }, [debts]);

    return {
        filteredDebts,
        debts,
        stats,
        isLoading,
        error: syncError,
        searchTerm,
        setSearchTerm,
        editing,
        setEditing,
        showDetail,
        setShowDetail,
        showScanner,
        openScanner,
        handleScanSuccess,
        closeScanner,
        notifications,
        addNotification,
        fetchDebts,
        createDebt: createDebtWithNotification,
        updateDebt: updateDebtWithNotification,
        deleteDebtFromDatabase,
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncTime,
        syncError,
        performSync,
        updatePendingCount,
    };
}