/**
 * OfflineIndicator - Small inline indicator for offline items
 * Shows on individual debt cards when they're pending sync
 */
import React from 'react';
import { motion } from 'framer-motion';
import { CloudOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function OfflineIndicator({
    status, // 'pending' | 'synced' | 'failed'
    size = 'sm', // 'xs' | 'sm' | 'md'
    showLabel = true,
}) {
    const sizeClasses = {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-1.5 text-sm',
    };

    const iconSizes = {
        xs: 'w-2.5 h-2.5',
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
    };

    const getStatusConfig = () => {
        switch (status) {
            case 'pending':
                return {
                    icon: CloudOff,
                    label: 'Offline',
                    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
                    textClass: 'text-amber-700 dark:text-amber-400',
                    borderClass: 'border-amber-200 dark:border-amber-800',
                };
            case 'syncing':
                return {
                    icon: RefreshCw,
                    label: 'Syncing',
                    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
                    textClass: 'text-indigo-700 dark:text-indigo-400',
                    borderClass: 'border-indigo-200 dark:border-indigo-800',
                    animate: true,
                };
            case 'synced':
                return {
                    icon: CheckCircle2,
                    label: 'Synced',
                    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
                    textClass: 'text-emerald-700 dark:text-emerald-400',
                    borderClass: 'border-emerald-200 dark:border-emerald-800',
                };
            case 'failed':
                return {
                    icon: AlertTriangle,
                    label: 'Sync failed',
                    bgClass: 'bg-red-100 dark:bg-red-900/30',
                    textClass: 'text-red-700 dark:text-red-400',
                    borderClass: 'border-red-200 dark:border-red-800',
                };
            default:
                return null;
        }
    };

    const config = getStatusConfig();

    if (!config || status === 'synced') return null;

    const Icon = config.icon;

    return (
        <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${sizeClasses[size]}
        ${config.bgClass}
        ${config.textClass}
        ${config.borderClass}
      `}
        >
            <Icon
                className={`
          ${iconSizes[size]} 
          ${config.animate ? 'animate-spin' : ''}
        `}
            />
            {showLabel && <span>{config.label}</span>}
        </motion.span>
    );
}