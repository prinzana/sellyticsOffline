import { useState, useCallback } from "react";
import { supabase } from "../../../../../supabaseClient";
import toast from "react-hot-toast";

export function useClientPortal() {
    const [loading, setLoading] = useState(false);
    const [portalData, setPortalData] = useState(null);
    const [session, setSession] = useState(null);

    // 1. Validate the invitation token from the URL
    const validateToken = useCallback(async (token) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("warehouse_client_portal_access")
                .select(`
                    *,
                    warehouse:warehouse_id (name),
                    client:client_id (client_name, business_name, email)
                `)
                .eq("access_token", token)
                .eq("is_active", true)
                .maybeSingle();

            if (error || !data) throw new Error("Invalid token");

            setPortalData(data);
            return true;
        } catch (error) {
            console.error(error);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // 2. Verify email and create a session
    const verifyEmail = useCallback(async (email) => {
        if (!portalData) return false;

        setLoading(true);
        try {
            // Validate email against allowed list or exact client email
            const isAllowed = portalData.allowed_emails.includes(email) ||
                portalData.client.email === email;

            if (!isAllowed) {
                toast.error("You do not have access with this email.");
                return false;
            }

            // Create a session entry
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 12);

            const sessionToken = Math.random().toString(36).substring(7);

            const { data: sessionData, error } = await supabase
                .from("warehouse_client_portal_sessions")
                .insert({
                    portal_access_id: portalData.id,
                    verified_email: email,
                    session_token: sessionToken,
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            setSession(sessionData);
            return true;
        } catch (error) {
            toast.error("Verification failed");
            return false;
        } finally {
            setLoading(false);
        }
    }, [portalData]);

    const submitDispatchRequest = useCallback(async ({ notes, items }) => {
        if (!session || !portalData) return false;

        setLoading(true);
        try {
            // 1. Create the request
            const { data: request, error: reqError } = await supabase
                .from("warehouse_dispatch_requests")
                .insert({
                    warehouse_id: portalData.warehouse_id,
                    client_id: portalData.client_id,
                    requested_by_email: session.verified_email,
                    notes: notes,
                    status: 'PENDING'
                })
                .select()
                .single();

            if (reqError) throw reqError;

            // 2. Create the items
            const requestItems = items.map(item => ({
                request_id: request.id,
                product_id: item.product_id,
                quantity: item.quantity
            }));

            const { error: itemsError } = await supabase
                .from("warehouse_dispatch_request_items")
                .insert(requestItems);

            if (itemsError) throw itemsError;

            // 3. Create a Notification for the Warehouse
            await supabase
                .from("warehouse_notifications")
                .insert({
                    warehouse_id: portalData.warehouse_id,
                    type: 'DISPATCH_REQUEST',
                    title: 'New Dispatch Request',
                    message: `${portalData.client.client_name} requested ${items.length} product(s).`,
                    link: `/c?view=requests&id=${request.id}`,
                    metadata: { requestId: request.id }
                });

            toast.success("Dispatch request submitted successfully!");
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit request.");
            return false;
        } finally {
            setLoading(false);
        }
    }, [session, portalData]);

    // 4. Fetch serials for a specific product
    const fetchProductSerials = useCallback(async (productId) => {
        if (!portalData) return [];
        // Note: Using a local loading state in the component is better to avoid flickering the whole portal
        try {
            const { data, error } = await supabase
                .from("warehouse_serials")
                .select("*")
                .eq("product_id", productId)
                .eq("client_id", portalData.client_id)
                .eq("warehouse_id", portalData.warehouse_id)
                .order("status", { ascending: true })
                .order("serial_number", { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Failed to fetch serials:", error);
            toast.error("Failed to load serial details");
            return [];
        }
    }, [portalData]);

    // 5. Fetch history for a specific product
    const fetchProductHistory = useCallback(async (productId) => {
        if (!portalData) return [];
        try {
            const { data, error } = await supabase
                .from("warehouse_ledger")
                .select("*")
                .eq("warehouse_product_id", productId)
                .eq("client_id", portalData.client_id)
                .eq("warehouse_id", portalData.warehouse_id)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Failed to fetch history:", error);
            return [];
        }
    }, [portalData]);

    return {
        validateToken,
        verifyEmail,
        submitDispatchRequest,
        fetchProductSerials,
        fetchProductHistory,
        loading,
        portalData,
        session
    };
}
