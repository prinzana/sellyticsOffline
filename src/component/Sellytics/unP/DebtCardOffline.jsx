/**
 * DebtCardOffline - Debt Card with Offline Status Indicator
 * Shows sync status badge for offline-created/modified debts
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    User,
    Package,
    Calendar,
    RotateCcw,
} from 'lucide-react';
import { useCurrency } from '../../context/currencyContext';
import OfflineIndicator from './ui/OfflineIndicator';

export default function DebtCardOffline({
    debt,
    onViewDetail,
    onEdit,
    onDelete,
    permissions,
}) {
    const [showMenu, setShowMenu] = useState(false);
    const { preferredCurrency = { code: 'USD', symbol: '$' } } = useCurrency() || {};

    // Safety: skip rendering if debt is invalid
    if (!debt || typeof debt !== 'object' || !debt.id) {
        return null;
    }

    const {
        canView = false,
        canEdit = false,
        canDelete = false,
    } = permissions || {};

    const hasAnyAction = canView || canEdit || canDelete;

    // Safe defaults
    const owed = debt.owed ?? 0;
    const deposited = debt.deposited ?? 0;
    const balance = owed - deposited;
    const isPaid = balance <= 0;
    const isPartial = deposited > 0 && balance > 0;
    const autoStatus = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid';
    const displayStatus = debt.status || autoStatus;

    const customerName = debt.customer_name ?? 'Unknown Customer';
    const productName = debt.product_name ?? 'Unknown Product';
    const customerPhone = debt.customer_phone ?? 'N/A';
    const date = debt.date ? new Date(debt.date).toLocaleDateString() : 'N/A';
    const isReturned = !!debt.is_returned;

    // Offline status
    const offlineStatus = debt._offline_status || 'synced';
    const isOffline = offlineStatus === 'pending' || String(debt.id).startsWith('offline_');

    const formatAmount = (amount) => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: preferredCurrency.code,
            }).format(amount);
        } catch {
            return `${preferredCurrency.symbol}${Number(amount).toFixed(2)}`;
        }
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        if (window.confirm(`Delete debt for ${customerName} (${productName})? This cannot be undone.`)) {
            onDelete?.(debt.id);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
        relative flex items-center justify-between gap-4 sm:gap-6 p-4 sm:p-5
        bg-white dark:bg-slate-800
        rounded-xl border 
        ${isOffline
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                    : 'border-slate-200 dark:border-slate-700'
                }
        transition-all duration-200 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500
        ${canView ? 'cursor-pointer' : 'cursor-default'}
      `}
            onClick={canView ? () => onViewDetail?.(debt) : undefined}
        >
            {/* Status Badges - Top Right */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
                {/* Offline Status */}
                {isOffline && (
                    <OfflineIndicator status={offlineStatus} size="xs" showLabel={false} />
                )}

                {/* Payment Status Badge */}
                <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${displayStatus === 'Paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : displayStatus === 'Partial'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}
                >
                    {displayStatus}
                </span>
            </div>

            {/* Left: Icon + Customer/Product Info */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0
          ${isOffline
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-indigo-100 dark:bg-indigo-900/30'
                    }
        `}>
                    <User className={`
            w-6 h-6 sm:w-7 sm:h-7 
            ${isOffline
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }
          `} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                            {customerName}
                        </h3>
                        {isOffline && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium">
                                OFFLINE
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {customerPhone}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                            {productName}
                        </span>
                    </div>
                </div>
            </div>

            {/* Center: Amounts (hidden on mobile) */}
            <div className="hidden sm:flex flex-col items-end gap-2">
                <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Owed</span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                        {formatAmount(owed)}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Balance</span>
                    <p className={`font-bold ${balance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatAmount(Math.max(balance, 0))}
                    </p>
                </div>
            </div>

            {/* Right: Date + Return + Actions */}
            <div className="flex items-center gap-4 sm:gap-6">
                {/* Date & Return (hidden on mobile) */}
                <div className="hidden md:flex flex-col items-end text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{date}</span>
                    </div>
                    {isReturned && (
                        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 mt-1">
                            <RotateCcw className="w-4 h-4" />
                            <span>Returned</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {hasAnyAction && (
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu((prev) => !prev);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <MoreVertical className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </button>

                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                                >
                                    {canView && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(false);
                                                onViewDetail?.(debt);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Details
                                        </button>
                                    )}

                                    {canEdit && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(false);
                                                onEdit?.(debt);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit Debt
                                        </button>
                                    )}

                                    {canDelete && (
                                        <button
                                            onClick={handleDeleteClick}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}