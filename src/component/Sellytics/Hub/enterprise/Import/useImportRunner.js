import { useState } from "react";
import { supabase } from "../../../../../supabaseClient";

export function useImportRunner({ warehouseId, clientId }) {
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState({ success: 0, errors: [] });

    const runImport = async (rows) => {
        setIsRunning(true);
        setResults({ success: 0, errors: [] });
        setProgress({ current: 0, total: rows.length });
        const errorLog = [];
        let successCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const currentType = r.product_type || "STANDARD";

            try {
                // 1. Duplicate ID Check for SERIALIZED items (Hardened for Partial Success)
                let finalSerials = r.serials || [];
                let skipCount = 0;

                if (currentType === "SERIALIZED" && finalSerials.length > 0) {
                    const { data: existingSerials } = await supabase
                        .from("warehouse_serials")
                        .select("serial_number")
                        .in("serial_number", finalSerials);

                    if (existingSerials?.length > 0) {
                        const existingValues = existingSerials.map(s => s.serial_number);
                        finalSerials = finalSerials.filter(sn => !existingValues.includes(sn));
                        skipCount = existingValues.length;

                        if (finalSerials.length === 0) {
                            throw new Error(`All ${skipCount} IDs in this row already exist in the system.`);
                        }
                    }
                }

                // Recalculate quantity if we skipped some serials
                const finalQuantity = currentType === "SERIALIZED" ? finalSerials.length : r.quantity;

                // 2. Find/Create Product
                const { data: existing } = await supabase
                    .from("warehouse_products")
                    .select("id")
                    .eq("warehouse_id", warehouseId)
                    .eq("warehouse_client_id", clientId)
                    .ilike("product_name", r.product_name)
                    .limit(1);

                let productId = existing?.[0]?.id;

                if (!productId) {
                    const { data: created, error: createError } = await supabase
                        .from("warehouse_products")
                        .insert({
                            warehouse_id: warehouseId,
                            warehouse_client_id: clientId,
                            product_name: r.product_name,
                            sku: r.sku,
                            product_type: currentType,
                            unit_cost: r.unit_cost,
                            created_by: localStorage.getItem("user_email")
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    productId = created.id;

                    await supabase.from("warehouse_inventory").insert({
                        warehouse_id: warehouseId,
                        warehouse_product_id: productId,
                        client_id: clientId,
                        quantity: r.quantity,
                        available_qty: r.quantity,
                        unit_cost: r.unit_cost
                    });
                } else {
                    const { data: inv } = await supabase
                        .from("warehouse_inventory")
                        .select("quantity, available_qty")
                        .eq("warehouse_product_id", productId)
                        .single();

                    await supabase
                        .from("warehouse_inventory")
                        .update({
                            quantity: (inv?.quantity || 0) + finalQuantity,
                            available_qty: (inv?.available_qty || 0) + finalQuantity,
                            unit_cost: r.unit_cost
                        })
                        .eq("warehouse_product_id", productId);
                }

                // 3. Create Ledger Entry
                const { data: ledger, error: ledgerError } = await supabase
                    .from("warehouse_ledger")
                    .insert({
                        warehouse_id: warehouseId,
                        warehouse_product_id: productId,
                        client_id: clientId,
                        movement_type: "IN",
                        movement_subtype: "IMPORT",
                        quantity: finalQuantity,
                        notes: `Imported via CSV. ${skipCount > 0 ? `${skipCount} duplicates skipped. ` : ""}${r.notes || ""}`,
                        created_by: localStorage.getItem("user_email")
                    })
                    .select()
                    .single();

                if (ledgerError) throw ledgerError;

                // 4. Create Serial Records
                if (currentType === "SERIALIZED" && finalSerials.length > 0) {
                    const serialInserts = finalSerials.map(sn => ({
                        warehouse_id: warehouseId,
                        product_id: productId,
                        client_id: clientId,
                        serial_number: sn,
                        status: "IN_STOCK",
                        last_ledger_id: ledger.id
                    }));

                    const { error: serialError } = await supabase
                        .from("warehouse_serials")
                        .insert(serialInserts);

                    if (serialError) throw serialError;
                } else if (currentType === "BATCH" && r.barcode) {
                    await supabase.from("warehouse_serials").insert({
                        warehouse_id: warehouseId,
                        product_id: productId,
                        client_id: clientId,
                        serial_number: r.barcode,
                        status: "IN_STOCK",
                        last_ledger_id: ledger.id
                    });
                }

                successCount++;
            } catch (err) {
                console.error("Row import error", err);
                errorLog.push({ row: r.rowIndex + 2, product: r.product_name, message: err.message });
            }

            setProgress(p => ({ ...p, current: i + 1 }));
        }

        setResults({ success: successCount, errors: errorLog });
        setIsRunning(false);
        return { success: successCount, errors: errorLog };
    };

    return { runImport, progress, isRunning, results };
}
