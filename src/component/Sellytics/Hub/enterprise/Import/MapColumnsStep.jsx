// steps/MapColumnsStep.jsx
import { ArrowRight } from "lucide-react";

const SYSTEM_FIELDS = [
    { value: "product_name", label: "Product Name *" },
    { value: "sku", label: "SKU" },
    { value: "unit_cost", label: "Unit Cost" },
    { value: "quantity", label: "Quantity" },
    { value: "barcode", label: "Barcode / Serial" },
    { value: "product_type", label: "Product Type" },
    { value: "notes", label: "Notes" },
    { value: "skip", label: "(Skip)" }
];

export default function MapColumnsStep({
    parsedData,
    columnMapping,
    setColumnMapping,
    onNext,
    onBack
}) {
    return (
        <div className="p-6 space-y-4">
            {parsedData.headers.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-1/3 bg-slate-100 px-3 py-2 rounded">
                        {h}
                    </div>
                    <ArrowRight />
                    <select
                        value={columnMapping[i] || ""}
                        onChange={(e) =>
                            setColumnMapping({ ...columnMapping, [i]: e.target.value })
                        }
                        className="flex-1 border px-3 py-2 rounded"
                    >
                        <option value="">Select field</option>
                        {SYSTEM_FIELDS.map(f => (
                            <option key={f.value} value={f.value}>
                                {f.label}
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            <div className="flex justify-between pt-4">
                <button onClick={onBack}>Back</button>
                <button onClick={onNext} className="bg-indigo-600 text-white px-6 py-2 rounded">
                    Next
                </button>
            </div>
        </div>
    );
}
