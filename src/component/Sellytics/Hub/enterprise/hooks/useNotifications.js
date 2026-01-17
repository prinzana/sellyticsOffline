import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../../supabaseClient";
import toast from "react-hot-toast";

export function useNotifications({ warehouseId, clientId = null }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!warehouseId) return;

        setLoading(true);
        try {
            let query = supabase
                .from("warehouse_notifications")
                .select("*")
                .eq("warehouse_id", warehouseId);

            if (clientId) {
                // Filter by client_id in metadata JSONB column
                query = query.filter("metadata->>client_id", "eq", clientId);
            }

            const { data, error } = await query
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
            setUnreadCount((data || []).filter(n => !n.is_read).length);
        } catch (error) {
            console.error("Fetch notifications error:", error);
        } finally {
            setLoading(false);
        }
    }, [warehouseId, clientId]);

    const markAsRead = async (notificationId) => {
        try {
            const { error } = await supabase
                .from("warehouse_notifications")
                .update({ is_read: true })
                .eq("id", notificationId);

            if (error) throw error;

            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error(error);
        }
    };

    const clearAllRead = async () => {
        try {
            let query = supabase
                .from("warehouse_notifications")
                .delete()
                .eq("warehouse_id", warehouseId)
                .eq("is_read", true);

            if (clientId) {
                query = query.filter("metadata->>client_id", "eq", clientId);
            }

            const { error } = await query;

            if (error) throw error;
            setNotifications(prev => prev.filter(n => !n.is_read));
        } catch (error) {
            toast.error("Failed to clear notifications");
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Realtime subscription
        const channel = supabase
            .channel(`warehouse_notifications_${warehouseId}_${clientId || 'all'}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'warehouse_notifications',
                    filter: `warehouse_id=eq.${warehouseId}`
                },
                (payload) => {
                    // Only add if it matches our clientId filter if one exists
                    if (clientId && payload.new.metadata?.client_id !== clientId) {
                        return;
                    }

                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    toast("New client request received!", { icon: "🔔" });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [warehouseId, clientId, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        clearAllRead,
        refetch: fetchNotifications
    };
}
