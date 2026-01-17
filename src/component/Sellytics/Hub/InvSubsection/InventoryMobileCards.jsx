import { RowMenu } from "./RowMenu";

export function InventoryMobileCards({
    items,
    onSelect,
    productModal,
    confirmDelete,
}) {
    return (
        <div className="lg:hidden space-y-4">
            {items.map((item) => (
                <div
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="bg-slate-50 border rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold">
                            {item.product.product_name}
                        </h3>

                        <div onClick={(e) => e.stopPropagation()}>
                            <RowMenu
                                onEdit={() => productModal.open(item.product, item)}
                                onDelete={() => confirmDelete(item.product)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                        <div className="text-emerald-600 font-bold">
                            Stock: {item.available_qty || 0}
                        </div>
                        <div className="text-rose-600">
                            Damaged: {item.damaged_qty || 0}
                        </div>
                        <div className="text-slate-400 text-xs">
                            Total: {item.quantity || 0}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
