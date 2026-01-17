import { RowMenu } from "./RowMenu";

export function InventoryTable({
    items,
    onSelect,
    formatPrice,
    productModal,
    confirmDelete,
}) {
    return (
        <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="px-4 py-3 text-left">Product</th>
                        <th className="px-4 py-3 text-left">SKU</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-right">In Stock</th>
                        <th className="px-4 py-3 text-right">Damaged</th>
                        <th className="px-4 py-3 text-right text-slate-400">Total</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th />
                    </tr>
                </thead>

                <tbody>
                    {items.map((item) => (
                        <tr
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="border-b hover:bg-slate-50 cursor-pointer"
                        >
                            <td className="px-4 py-4 font-medium">
                                {item.product.product_name}
                            </td>
                            <td className="px-4 py-4">{item.product.sku || "-"}</td>
                            <td className="px-4 py-4">{item.product.product_type}</td>
                            <td className="px-4 py-4 text-right text-emerald-600 font-bold">
                                {item.available_qty || 0}
                            </td>
                            <td className="px-4 py-4 text-right text-rose-600">
                                {item.damaged_qty || 0}
                            </td>
                            <td className="px-4 py-4 text-right text-slate-400">
                                {item.quantity || 0}
                            </td>
                            <td className="px-4 py-4 text-right">
                                {item.unit_cost ? formatPrice(item.unit_cost) : "-"}
                            </td>
                            <td className="px-4 py-4 text-right text-indigo-600">
                                {item.total_cost ? formatPrice(item.total_cost) : "-"}
                            </td>
                            <td
                                className="px-4 py-4 text-right"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <RowMenu
                                    onEdit={() => productModal.open(item.product, item)}
                                    onDelete={() => confirmDelete(item.product)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
