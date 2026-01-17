/**
 * SyncStatusBadge - Shows offline/sync status
 * Displays pending sync count and online/offline indicator
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wifi,
    WifiOff,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    CloudOff,
    Cloud
} from 'lucide-react';

export default function SyncStatusBadge({
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncTime,
    syncError,
    onSyncClick,
    compact = false,
}) {
    const formatLastSync = (date) => {
        if (!date) return 'Never';
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {/* Online/Offline indicator */}
                <div
                    className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
            ${isOnline
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }
          `}
                >
                    {isOnline ? (
                        <Wifi className="w-3.5 h-3.5" />
                    ) : (
                        <WifiOff className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                </div>

                {/* Pending sync count */}
                <AnimatePresence>
                    {pendingSyncCount > 0 && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            onClick={onSyncClick}
                            disabled={isSyncing || !isOnline}
                            className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200
                ${isSyncing
                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>{pendingSyncCount}</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
        flex flex-wrap items-center gap-3 p-3 rounded-xl border
        ${isOnline
                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                }
      `}
        >
            {/* Status icon */}
            <div
                className={`
          w-10 h-10 rounded-xl flex items-center justify-center
          ${isOnline
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    }
        `}
            >
                {isOnline ? (
                    <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                    <CloudOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
            </div>

            {/* Status text */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`
            font-semibold text-sm
            ${isOnline
                            ? 'text-slate-900 dark:text-white'
                            : 'text-amber-800 dark:text-amber-200'
                        }
          `}>
                        {isOnline ? 'Connected' : 'Working Offline'}
                    </span>

                    {syncError && (
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="w-3 h-3" />
                            Sync error
                        </span>
                    )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isSyncing
                        ? 'Syncing changes...'
                        : lastSyncTime
                            ? `Last sync: ${formatLastSync(lastSyncTime)}`
                            : 'Not synced yet'
                    }
                </p>
            </div>

            {/* Pending sync badge */}
            <AnimatePresence>
                {pendingSyncCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                            <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                                {pendingSyncCount} pending
                            </span>
                        </div>

                        <button
                            onClick={onSyncClick}
                            disabled={isSyncing || !isOnline}
                            className={`
                p-2 rounded-lg transition-all duration-200
                ${isSyncing
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            <RefreshCw
                                className={`
                  w-4 h-4 
                  ${isSyncing ? 'text-indigo-600 dark:text-indigo-400 animate-spin' : 'text-white'}
                `}
                            />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* All synced indicator */}
            {pendingSyncCount === 0 && isOnline && !isSyncing && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">All synced</span>
                </div>
            )}
        </motion.div>
    );
}