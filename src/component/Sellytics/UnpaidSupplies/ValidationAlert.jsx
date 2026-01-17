import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const ValidationAlert = ({ validationErrors, onDismiss }) => {
    if (!validationErrors || validationErrors.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-800 rounded-xl p-4 mb-4"
        >
            <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
                        ⚠️ Validation Errors
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        Please fix the following errors before saving:
                    </p>

                    <div className="space-y-3">
                        {validationErrors.map((error, idx) => (
                            <div
                                key={idx}
                                className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-red-200 dark:border-red-700"
                            >
                                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                                    Entry {error.entryNumber}:
                                </h4>
                                <ul className="space-y-1">
                                    {error.errors.map((err, errIdx) => (
                                        <li
                                            key={errIdx}
                                            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            {err}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={onDismiss}
                        className="mt-3 text-sm text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ValidationAlert;

