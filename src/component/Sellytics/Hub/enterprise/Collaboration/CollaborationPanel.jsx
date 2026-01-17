// enterprise/Collaboration/CollaborationPanel.jsx
// Real-time multi-user collaboration panel
import React, { useState } from "react";
import {
    Users,

    Copy,
    Check,

    X,
    User,
    Eye,
    Edit3,
    Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useCollaboration } from "./useCollaboration";


export default function CollaborationPanel({
    warehouseId,
    clientId,
    isOpen,
    onClose,
}) {
    const collab = useCollaboration({ warehouseId, clientId });
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-[90]"
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="fixed right-4 top-4 bottom-4 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[100] flex flex-col"
            >
                {/* Header */}
                <div className="px-4 py-3 bg-indigo-900 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <Users className="w-5 h-5" />
                        <span className="font-semibold">Collaboration</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/20 text-white transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Session Status */}
                    {!collab.activeSession ? (
                        <div className="space-y-3">
                            <button
                                onClick={collab.startSession}
                                disabled={collab.isLoading}
                                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition"
                            >
                                {collab.isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Users className="w-5 h-5" />
                                        Start Collaboration Session
                                    </>
                                )}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                                        or join existing
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={collab.joinCode}
                                    onChange={(e) => collab.setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="Enter session code"
                                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-mono uppercase"
                                />
                                <button
                                    onClick={collab.joinSession}
                                    disabled={!collab.joinCode || collab.isLoading}
                                    className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg disabled:opacity-50"
                                >
                                    Join
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Active Session Card */}
                            <div className="p-3 bg-indigo-900 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                                        Session Active
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        Live
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg font-mono text-sm text-slate-900 dark:text-white">
                                        {collab.activeSession.session_code}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(collab.activeSession.session_code)}
                                        className="p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-slate-500" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Participants */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Participants
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {collab.participants.length} online
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {collab.participants.map((p) => (
                                        <div
                                            key={p.user_email}
                                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.role === "owner"
                                                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                                                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                                    }`}>
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {p.user_email.split("@")[0]}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {p.current_view || "Viewing"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {p.role === "editor" ? (
                                                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                                ) : p.role === "viewer" ? (
                                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                                ) : null}
                                                <span className={`w-2 h-2 rounded-full ${p.status === "active" ? "bg-emerald-500" :
                                                    p.status === "idle" ? "bg-amber-500" :
                                                        "bg-slate-400"
                                                    }`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Recent Activity
                                </div>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs">
                                    {collab.activities.slice(0, 10).map((activity, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 text-slate-600 dark:text-slate-400"
                                        >
                                            <span className="text-slate-400 dark:text-slate-500">
                                                {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            <span>{activity.message}</span>
                                        </div>
                                    ))}
                                    {collab.activities.length === 0 && (
                                        <div className="text-slate-400 dark:text-slate-500 text-center py-4">
                                            No activity yet
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* End Session */}
                            <button
                                onClick={collab.endSession}
                                className="w-full py-2 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition text-sm font-medium"
                            >
                                End Session
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </>
    );
}
