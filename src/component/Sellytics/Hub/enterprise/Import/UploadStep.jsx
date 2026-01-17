import { FileSpreadsheet, Upload } from "lucide-react";

export default function UploadStep({ fileInputRef, onSelect, onDrop }) {
    const downloadTemplate = (e) => {
        e.stopPropagation(); // Prevent triggering file upload click
        const headers = ["Product Name", "SKU", "Product Type (STANDARD/SERIALIZED/BATCH)", "Unit Cost", "Quantity", "Barcode/Serial (Optional)", "Notes"];
        const rows = [
            ["Example Shirt", "SHIRT-001", "STANDARD", "12.50", "100", "", "Classic cotton shirt"],
            ["Premium Phone", "PHN-X", "SERIALIZED", "800.00", "", "SN100, SN101, SN102", "3 IDs = Qty 3 (Auto)"],
            ["Batch of Cables", "CBL-100", "BATCH", "2.00", "50", "BATCH-CODE-X", "Box of 50"],
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sellytics_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-400 transition bg-slate-50 dark:bg-slate-800/50"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    hidden
                    onChange={(e) => onSelect(e.target.files[0])}
                />
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                    Drag & drop your file here
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    or click to browse
                </p>
            </div>

            <div className="text-center">
                <button
                    onClick={downloadTemplate}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1.5 mx-auto font-medium"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Download CSV Template
                </button>
            </div>
        </div>
    );
}
