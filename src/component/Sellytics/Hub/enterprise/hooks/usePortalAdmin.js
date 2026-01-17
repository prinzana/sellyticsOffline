import { useState, useCallback } from "react";
import { supabase } from "../../../../../supabaseClient";
import toast from "react-hot-toast";

export function usePortalAdmin({ warehouseId }) {
    const [loading, setLoading] = useState(false);

    // Generate or fetch a portal access link for a client
    const getPortalAccess = useCallback(async (client) => {
        if (!client || !client.id) return null;

        setLoading(true);
        try {
            // Check if one already exists
            const { data: existing } = await supabase
                .from("warehouse_client_portal_access")
                .select("*")
                .eq("client_id", client.id)
                .eq("warehouse_id", warehouseId)
                .eq("is_active", true)
                .maybeSingle();

            if (existing) return existing;

            // Generate new token
            const token = Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);

            const { data, error } = await supabase
                .from("warehouse_client_portal_access")
                .insert({
                    warehouse_id: warehouseId,
                    client_id: client.id,
                    access_token: token,
                    allowed_emails: [client.email].filter(Boolean),
                    permissions: {
                        view_inventory: true,
                        view_movements: true,
                        request_dispatch: true
                    }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Portal access error:", error);
            toast.error("Failed to manage portal access");
            return null;
        } finally {
            setLoading(false);
        }
    }, [warehouseId]);

    const deactivatePortal = async (accessId) => {
        try {
            const { error } = await supabase
                .from("warehouse_client_portal_access")
                .update({ is_active: false })
                .eq("id", accessId);

            if (error) throw error;
            toast.success("Portal access deactivated");
        } catch (error) {
            toast.error("Deactivation failed");
        }
    };

    return {
        getPortalAccess,
        deactivatePortal,
        loading
    };
}
