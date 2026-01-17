import { useState } from "react";
import toast from "react-hot-toast";

export function useImportParser() {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState({ headers: [], rows: [], totalRows: 0 });
    const [columnMapping, setColumnMapping] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);

    const parseCSVLine = (line) => {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
            } else current += char;
        }
        result.push(current.trim());
        return result;
    };

    const handleFileSelect = async (selectedFile, onDone) => {
        if (!selectedFile) return;

        // Basic Validation
        if (!selectedFile.name.endsWith(".csv") && selectedFile.type !== "text/csv") {
            toast.error("Please upload a CSV file (.csv)");
            return;
        }

        setIsProcessing(true);
        setFile(selectedFile);

        try {
            const text = await selectedFile.text();
            const lines = text.split("\n").filter(l => l.trim().length > 0);

            if (lines.length < 2) {
                toast.error("File is empty or missing headers");
                setIsProcessing(false);
                return;
            }

            const headers = parseCSVLine(lines[0]);
            const rows = lines.slice(1, 101).map(parseCSVLine);

            const autoMap = {};
            headers.forEach((h, i) => {
                const n = (h || "").toLowerCase();
                if (n.includes("name") || n.includes("product")) autoMap[i] = "product_name";
                else if (n.includes("sku")) autoMap[i] = "sku";
                else if (n.includes("cost") || n.includes("price")) autoMap[i] = "unit_cost";
                else if (n.includes("qty") || n.includes("quantity")) autoMap[i] = "quantity";
                else if (n.includes("barcode") || n.includes("serial")) autoMap[i] = "barcode";
                else if (n.includes("type")) autoMap[i] = "product_type";
                else if (n.includes("note")) autoMap[i] = "notes";
            });

            setParsedData({ headers, rows, totalRows: lines.length - 1 });
            setColumnMapping(autoMap);
            onDone?.();

        } catch (err) {
            console.error("Parse error", err);
            toast.error("Failed to parse CSV file");
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        file,
        parsedData,
        columnMapping,
        setColumnMapping,
        isProcessing,
        handleFileSelect
    };
}
