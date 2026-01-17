// steps/ValidationStep.jsx
import {
    AlertCircle,
    CheckCircle2,
    Loader2
} from "lucide-react";

export default function ValidationStep({
    results,
    onImport,
    onBack,
    isImporting,
    progress
}) {
    return (
        <div className="p-6 space-y-6 flex flex-col h-full">
            <div className="grid grid-cols-2 gap-4 shrink-0">
                <div className="p-4 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 />
                        <span className="font-semibold">
                            {results.valid.length} Valid Rows
                        </span>
                    </div>
                </div>

                <div className="p-4 bg-rose-50 rounded-lg">
                    <div className="flex items-center gap-2 text-rose-600">
                        <AlertCircle />
                        <span className="font-semibold">
                            {results.errors.length} Errors
                        </span>
                    </div>
                </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col bg-slate-50">
                <div className="px-4 py-2 border-b bg-white font-medium text-slate-700 flex justify-between items-center shrink-0">
                    <span>Import Preview (Valid Rows)</span>
                    <span className="text-xs text-slate-500">Showing all {results.valid.length} rows</span>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2 text-left border-b font-semibold text-slate-600">Product</th>
                                <th className="px-3 py-2 text-left border-b font-semibold text-slate-600">Type</th>
                                <th className="px-3 py-2 text-left border-b font-semibold text-slate-600">Qty</th>
                                <th className="px-3 py-2 text-left border-b font-semibold text-slate-600">Serials/IDs</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {results.valid.map((r, idx) => (
                                <tr key={idx} className="border-b last:border-0 hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-3 py-2 font-medium text-slate-900">{r.product_name}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${r.product_type === 'SERIALIZED' ? 'bg-purple-100 text-purple-700' :
                                                r.product_type === 'BATCH' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {r.product_type}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">{r.quantity}</td>
                                    <td className="px-3 py-2">
                                        {r.serials?.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {r.serials.map((s, i) => (
                                                    <span key={i} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] border border-blue-100">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">None</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {results.errors.length > 0 && (
                <div className="border border-rose-200 rounded-lg p-3 max-h-32 overflow-y-auto bg-rose-50/30 shrink-0">
                    <h4 className="text-xs font-bold text-rose-700 mb-1 uppercase tracking-wider">Validation Errors</h4>
                    {results.errors.map((e, i) => (
                        <div key={i} className="text-sm text-rose-600 flex gap-2">
                            <span className="font-mono text-rose-400">Row {e.row}:</span>
                            {e.message}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-between shrink-0 pt-2 border-t">
                <button onClick={onBack} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                    Back
                </button>

                <button
                    onClick={onImport}
                    disabled={isImporting || results.valid.length === 0}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition shadow-sm"
                >
                    {isImporting ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin w-4 h-4" />
                            Importing {progress.current}/{progress.total}
                        </span>
                    ) : (
                        "Start Import"
                    )}
                </button>
            </div>
        </div>
    );
}
