// src/components/SalesDashboard/hooks/useSalesData.js
import { useState, useEffect } from "react";
import { supabase } from "../../../../supabaseClient";

import { getAllSales, getPendingSalesCount } from "../../db/salesCache";
import { getAllProducts } from "../../db/productCache";
import { getAllCustomers } from "../../db/customerCache";
import db from "../../db/dexieDb";

export default function useSalesData() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // -- Connection & Sync Status --
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing,] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const storeId = localStorage.getItem("store_id");

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Track pending items and last sync time
  useEffect(() => {
    if (!storeId) return;

    const updateSyncStatus = async () => {
      const count = await getPendingSalesCount(storeId);
      setPendingSyncCount(count);

      const lastSync = await db.getLastSyncTime(storeId);
      if (lastSync) setLastSyncTime(new Date(lastSync));
    };

    updateSyncStatus();

    // Subscribe to Dexie changes if possible, or poll periodically
    const interval = setInterval(updateSyncStatus, 5000);
    return () => clearInterval(interval);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    async function fetchSales() {
      setLoading(true);

      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from("dynamic_sales")
            .select(`
              id,
              dynamic_product_id,
              quantity,
              unit_price,
              amount,
              sold_at,
              customer_id,
              dynamic_product(name),
              customer(id, fullname)
            `)
            .eq("store_id", storeId)
            .order("sold_at", { ascending: false });

          if (!error && data) {
            const normalized = data.map((s) => ({
              id: s.id,
              productId: s.dynamic_product_id,
              productName: s.dynamic_product?.name ?? "Unknown",
              quantity: Number(s.quantity),
              unitPrice: Number(s.unit_price),
              totalSales: Number(s.amount),
              soldAt: new Date(s.sold_at),
              customerId: s.customer_id,
              customerName: s.customer?.fullname ?? "Anonymous",
              _offline_status: 'synced',
              _synced: true,
            }));

            setSales(normalized);
            setLoading(false);
            return;
          } else if (error) {
            console.error("Supabase error fetching sales:", error);
          }
        } catch (err) {
          console.error("Failed to fetch from Supabase, falling back to offline data:", err);
        }
      }

      // Offline or Supabase failed
      try {
        const [offlineSales, offlineProducts, offlineCustomers] = await Promise.all([
          getAllSales(storeId),
          getAllProducts(storeId),
          getAllCustomers(storeId),
        ]);

        const productMap = new Map(offlineProducts.map(p => [Number(p.id), p.name]));
        const customerMap = new Map(offlineCustomers.map(c => [Number(c.id), c.fullname]));

        const normalized = offlineSales.map(s => ({
          id: s.id,
          productId: s.dynamic_product_id,
          productName: productMap.get(Number(s.dynamic_product_id)) || "Unknown",
          quantity: Number(s.quantity),
          unitPrice: Number(s.unit_price),
          totalSales: Number(s.amount),
          soldAt: new Date(s.sold_at),
          customerId: s.customer_id,
          customerName: customerMap.get(Number(s.customer_id)) || "Anonymous",
          _offline_status: s._offline_status || 'pending',
          _synced: !!s._synced,
        }));

        setSales(normalized);
      } catch (err) {
        console.error("Dexie error fetching sales:", err);
      }

      setLoading(false);
    }

    fetchSales();

    // Listen for online status changes to refresh
    const handleStatusChange = () => fetchSales();
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [storeId]);

  return {
    sales,
    loading,
    setSales,
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncTime
  };
}
