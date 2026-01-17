import { useState } from "react";

export function useInventorySelection() {
    const [selectedProduct, setSelectedProduct] = useState(null);

    const open = (item) => setSelectedProduct(item);
    const close = () => setSelectedProduct(null);

    return {
        selectedProduct,
        open,
        close,
    };
}
