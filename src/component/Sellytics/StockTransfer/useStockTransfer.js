import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../supabaseClient";

import { getAllTransfers, getPendingTransfersCount } from "./stockTransferCache";
import db from "../db/dexieDb";

export const useStockTransfer = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(localStorage.getItem("store_id") || "");
  const [inventory, setInventory] = useState([]);
  const [fullInventory, setFullInventory] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isStoreOwner, setIsStoreOwner] = useState(false);
  const [userId, setUserId] = useState(localStorage.getItem("user_id") || null);
  const [storeIdState, setStoreIdState] = useState(localStorage.getItem("store_id") || null);
  const [ownerIdState, setOwnerIdState] = useState(localStorage.getItem("owner_id") || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  // -- Offline & Sync Status --
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);


  const paginate = (page) => page >= 1 && page <= totalPages && setCurrentPage(page);

  // Network monitoring
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
    if (!storeIdState) return;

    const updateSyncStatus = async () => {
      const count = await getPendingTransfersCount(storeIdState);
      setPendingSyncCount(count);

      const lastSync = await db.getLastSyncTime(storeIdState);
      if (lastSync) setLastSyncTime(new Date(lastSync));
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000);
    return () => clearInterval(interval);
  }, [storeIdState]);

  // User & ownership detection
  useEffect(() => {
    async function loadUser() {
      setLoadingUser(true);
      try {
        let email = localStorage.getItem("user_email");
        if (!email) {
          const { data } = await supabase.auth.getUser();
          email = data?.user?.email;
        }
        if (!email) throw new Error("Login required");

        const { data: storeData, error: sErr } = await supabase
          .from("stores")
          .select("id, owner_user_id")
          .eq("email_address", email)
          .maybeSingle();

        if (sErr) throw sErr;

        if (storeData) {
          setIsStoreOwner(true);
          const sid = String(storeData.id);
          const oid = storeData.owner_user_id ? String(storeData.owner_user_id) : "";
          setStoreIdState(sid);
          setOwnerIdState(oid);
          localStorage.setItem("store_id", sid);
          if (oid) localStorage.setItem("owner_id", oid);

          const { data: u } = await supabase
            .from("store_users")
            .select("id")
            .eq("email_address", email)
            .eq("store_id", storeData.id)
            .maybeSingle();
          if (u) {
            setUserId(String(u.id));
            localStorage.setItem("user_id", String(u.id));
          } else {
            const { data: userData, error } = await supabase
              .from("store_users")
              .select("id, store_id, owner_id")
              .eq("email_address", email)
              .maybeSingle();
            if (error || !userData) throw new Error("User not found in any store");
            setUserId(String(userData.id));
            setStoreIdState(String(userData.store_id));
            setOwnerIdState(userData.owner_id ? String(userData.owner_id) : "");
            localStorage.setItem("user_id", String(userData.id));
            localStorage.setItem("store_id", String(userData.store_id));
            if (userData.owner_id) localStorage.setItem("owner_id", String(userData.owner_id));
          }
        }
      } catch (e) {
        console.error("Auth initialization error:", e);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  const fetchInventory = useCallback(async (storeId) => {
    if (!storeId || !navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from("dynamic_inventory")
        .select(`
          id, dynamic_product_id, available_qty,
          dynamic_product:dynamic_product_id (id, name)
        `)
        .eq("store_id", storeId);
      if (error) throw error;
      setFullInventory(data || []);
      setInventory(data || []);
    } catch (e) {
      if (e.message !== 'Failed to fetch') {
        console.error("Inventory fetch failed:", e);
      }
    }
  }, []);

  const fetchStores = useCallback(async (ownerId) => {
    if (!ownerId || !navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, shop_name")
        .eq("owner_user_id", ownerId)
        .order("shop_name");
      if (error) throw error;
      setStores(data || []);
    } catch (e) {
      if (e.message !== 'Failed to fetch') {
        console.error("Stores fetch failed:", e);
      }
    }
  }, []);


  const fetchHistory = useCallback(async (ownerId, storeId) => {
    if (!ownerId) return;
    try {
      let onlineTransfers = [];
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("stock_transfer_requests")
          .select(`
            id, quantity, status, requested_at,
            source_store: source_store_id (shop_name),
            destination_store: destination_store_id (shop_name),
            product: dynamic_product_id (name, selling_price)
          `)
          .eq("store_owner_id", ownerId)
          .order("requested_at", { ascending: false });
        if (error) throw error;
        onlineTransfers = data || [];
      }

      // Merge with offline transfers
      const offlineTransfers = await getAllTransfers(storeId);

      const enrichedOnline = onlineTransfers.map(t => ({
        ...t,
        worth: (t.product?.selling_price || 0) * t.quantity,
        _offline_status: 'synced',
        _synced: 1,
      }));

      const rawOffline = offlineTransfers
        .filter(ot => ot._synced !== 1)
        .map(t => ({
          ...t,
          worth: 0,
          product: { name: t.product_name || "Product" },
          requested_at: t.requested_at,
        }));

      // Atomic update to prevent flickering
      setTransferHistory([...rawOffline, ...enrichedOnline]);
    } catch (e) {
      console.error("History fetch failed:", e);
    }
  }, []);

  // Enrich offline items with store names from the 'stores' state
  const enrichedHistory = useMemo(() => {
    return transferHistory.map(t => {
      if (t._synced === 1) return t;
      return {
        ...t,
        source_store: { shop_name: stores.find(s => String(s.id) === String(t.source_store_id))?.shop_name || "Self (Offline)" },
        destination_store: { shop_name: stores.find(s => String(s.id) === String(t.destination_store_id))?.shop_name || "Store (Offline)" },
      };
    });
  }, [transferHistory, stores]);

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentEntries = useMemo(() => enrichedHistory.slice(indexOfFirst, indexOfLast), [enrichedHistory, indexOfFirst, indexOfLast]);
  const totalPages = useMemo(() => Math.ceil(enrichedHistory.length / entriesPerPage), [enrichedHistory.length, entriesPerPage]);

  // Combined data loader to prevent multiple render cycles
  const loadAllData = useCallback(async () => {
    if (loadingUser || !ownerIdState || !storeIdState) return;

    // fetchHistory merges online and offline, so it's always safe to call
    // but we can pass the online status to optimize
    const isActuallyOnline = navigator.onLine;

    if (!isActuallyOnline) {
      setLoading(true);
      await fetchHistory(ownerIdState, selectedStore || storeIdState);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        fetchStores(ownerIdState),
        fetchInventory(selectedStore || storeIdState),
        fetchHistory(ownerIdState, selectedStore || storeIdState)
      ]);
    } catch (err) {
      console.error("Data loading error:", err);
    } finally {
      setLoading(false);
    }
  }, [loadingUser, ownerIdState, storeIdState, selectedStore, fetchStores, fetchInventory, fetchHistory]);

  // Trigger load on key changes
  useEffect(() => {
    loadAllData();
  }, [loadAllData, isOnline]);

  // Search filter
  useEffect(() => {
    if (!searchQuery) {
      setInventory(fullInventory);
      return;
    }
    const q = searchQuery.toLowerCase();
    setInventory(
      fullInventory.filter(i =>
        (i.dynamic_product?.name ?? `Product #${i.dynamic_product_id}`)
          .toLowerCase()
          .includes(q)
      )
    );
  }, [searchQuery, fullInventory]);

  const handleStoreChange = (id) => {
    setSelectedStore(id);
    localStorage.setItem("store_id", id);
    setSearchQuery("");
  };

  const refreshData = () => {
    loadAllData();
  };

  return {
    stores,
    selectedStore,
    inventory,
    transferHistory,
    currentEntries,
    totalPages,
    currentPage,
    loading,
    loadingUser,
    isStoreOwner,
    searchQuery,
    setSearchQuery,
    handleStoreChange,
    paginate,
    refreshData,
    userId,
    ownerIdState,
    isOnline,
    pendingSyncCount,
    lastSyncTime,
  };
};
