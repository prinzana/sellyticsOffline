export function useImportValidation(parsedData, columnMapping) {
    const validate = () => {
        const valid = [];
        const errors = [];

        const findCol = (field) =>
            Object.entries(columnMapping).find(([, v]) => v === field)?.[0];

        const nameCol = findCol("product_name");

        if (!nameCol) {
            alert("Product Name is required");
            return { valid: [], errors: [] };
        }

        parsedData.rows.forEach((row, i) => {
            const name = row[nameCol]?.trim();
            if (!name) {
                errors.push({ row: i + 2, message: "Missing product name" });
            } else {
                const typeRaw = row[findCol("product_type")]?.trim();
                const type = typeRaw ? typeRaw.toUpperCase() : "STANDARD";
                const barcodeRaw = row[findCol("barcode")]?.trim();

                // Parse IDs for SERIALIZED products
                let quantity = parseInt(row[findCol("quantity")]) || 1;
                let serials = [];

                if (type === "SERIALIZED" && barcodeRaw) {
                    // Split by comma, semicolon, space, or newline and filter out empty strings
                    serials = barcodeRaw.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => s);
                    if (serials.length > 0) {
                        quantity = serials.length;
                    }
                }

                valid.push({
                    rowIndex: i,
                    product_name: name,
                    sku: row[findCol("sku")]?.trim(),
                    unit_cost: parseFloat(row[findCol("unit_cost")]) || null,
                    quantity: quantity,
                    barcode: barcodeRaw,
                    serials: serials,
                    product_type: type,
                    notes: row[findCol("notes")]?.trim()
                });
            }
        });

        return { valid, errors };
    };

    return { validate };
}
