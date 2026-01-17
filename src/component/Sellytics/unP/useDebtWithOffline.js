/**
 * useDebtWithOffline Hook - Main hook for debt management
 * Combines offline support with all debt operations
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import useDebtOffline from './useDebtOffline';
import toast from 'react-hot-toast';

export default function useDebtWithOffline() {
    const storeId = localStorage.getItem('store_id');

    // Get offline-enabled debt operations
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

    // UI State
    const [filteredDebts, setFilteredDebts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editing, setEditing] = useState(null);
    const [showDetail, setShowDetail] = useState(null);

    // Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [scannerCallback, setScannerCallback] = useState(null);

    // Notifications
    const [notifications, setNotifications] = useState([]);

    // ==================== NOTIFICATIONS ====================

    const addNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);

        // Also show toast for important messages
        if (type === 'success') {
            toast.success(message, { duration: 2000 });
        } else if (type === 'error') {
            toast.error(message, { duration: 3000 });
        }
    }, []);

    // ==================== SEARCH & FILTER ====================

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredDebts(debts);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = debts.filter(d =>
            [
                d.customer_name,
                d.product_name,
                d.phone_number,
                ...(d.deviceIds || [])
            ].some(field => field?.toLowerCase().includes(term))
        );

        setFilteredDebts(filtered);
    }, [searchTerm, debts]);

    // ==================== CRUD WRAPPERS ====================

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

    // ==================== SCANNER CONTROL ====================

    const openScanner = useCallback((onSuccessCallback) => {
        if (typeof onSuccessCallback !== 'function') {
            addNotification('Scanner error: invalid callback', 'error');
            return;
        }
        setScannerCallback(() => onSuccessCallback);
        setShowScanner(true);
        addNotification('Scanner opened — point at barcode/IMEI', 'info');
    }, [addNotification]);

    const closeScanner = useCallback(() => {
        setShowScanner(false);
        setScannerCallback(null);
    }, []);

    const handleScanSuccess = useCallback((code) => {
        if (scannerCallback) {
            scannerCallback(code.trim());
        }
        closeScanner();
        addNotification(`Scanned: ${code.trim()}`, 'success');
    }, [scannerCallback, closeScanner, addNotification]);

    // ==================== COMPUTED VALUES ====================

    const stats = useMemo(() => {
        const total = debts.length;
        const paid = debts.filter(d => {
            const balance = (d.owed || 0) - (d.deposited || 0);
            return balance <= 0;
        }).length;
        const unpaid = total - paid;
        const totalOwed = debts.reduce((sum, d) => sum + (d.owed || 0), 0);
        const totalPaid = debts.reduce((sum, d) => sum + (d.deposited || 0), 0);
        const totalBalance = totalOwed - totalPaid;
        const pendingSync = debts.filter(d => d._offline_status === 'pending').length;

        return {
            total,
            paid,
            unpaid,
            totalOwed,
            totalPaid,
            totalBalance,
            pendingSync,
        };
    }, [debts]);

    // ==================== RETURN ====================

    return {
        // Data
        filteredDebts,
        debts,
        stats,

        // Loading states
        isLoading,
        error: syncError,

        // Search & filter
        searchTerm,
        setSearchTerm,

        // Modal states
        editing,
        setEditing,
        showDetail,
        setShowDetail,

        // Scanner
        showScanner,
        openScanner,
        handleScanSuccess,
        closeScanner,

        // Notifications
        notifications,
        addNotification,

        // CRUD operations
        fetchDebts,
        createDebt: createDebtWithNotification,
        updateDebt: updateDebtWithNotification,
        deleteDebtFromDatabase,

        // Sync status
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncTime,
        syncError,
        performSync,
        updatePendingCount,
    };
}