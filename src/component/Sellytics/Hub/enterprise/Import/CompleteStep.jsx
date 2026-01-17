import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function CompleteStep({ results, onDone }) {
    const [showErrors, setShowErrors] = useState(false);
    const hasErrors = results?.errors?.length > 0;

    return (
        <div className="p-8 text-center flex flex-col items-center max-w-2xl mx-auto">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Import Finished</h3>

            <div className="flex gap-4 mb-8">
                <div className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results?.success || 0}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Successful</div>
                </div>

                {hasErrors && (
                    <div className="px-6 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl">
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{results?.errors?.length || 0}</div>
                        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium uppercase tracking-wider">Failed</div>
                    </div>
                )}
            </div>

            {hasErrors && (
                <div className="w-full mb-8 text-left border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/30">
                    <button
                        onClick={() => setShowErrors(!showErrors)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            View Error Details
                        </div>
                        {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showErrors && (
                        <div className="px-4 py-3 border-t bg-white dark:bg-slate-800 max-h-48 overflow-y-auto">
                            {results.errors.map((err, i) => (
                                <div key={i} className="py-2 border-b last:border-0 flex flex-col gap-0.5">
                                    <div className="text-xs font-bold text-slate-500 uppercase">Row {err.row} | {err.product}</div>
                                    <div className="text-sm text-rose-600">{err.message}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm">
                Your inventory has been updated. You can find the new products and movements in the hub.
            </p>

            <button
                onClick={onDone}
                className="w-full sm:w-auto px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition transform hover:-translate-y-0.5"
            >
                Return to Hub
            </button>
        </div>
    );
}
