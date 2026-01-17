// enterprise/Collaboration/useCollaboration.js
// Hook for real-time collaboration using Supabase Realtime
import { useState, useEffect } from "react";
import { supabase } from "../../../../../supabaseClient";
import toast from "react-hot-toast";

/**
 * COLLABORATION HOOK
 * 
 * Uses Supabase Realtime for:
 * - Session management
 * - Presence tracking
 * - Activity broadcasting
 */
export function useCollaboration({ warehouseId, clientId }) {
    const userEmail = localStorage.getItem("user_email");

    const [activeSession, setActiveSession] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [joinCode, setJoinCode] = useState("");

    // Generate random session code
    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return "SLY-" + Array.from({ length: 6 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join("");
    };

    // Start new session
    const startSession = async () => {
        if (!warehouseId) return;

        setIsLoading(true);
        try {
            const sessionCode = generateCode();

            const { data: session, error } = await supabase
                .from("warehouse_collaboration_sessions")
                .insert({
                    warehouse_id: warehouseId,
                    client_id: clientId,
                    session_code: sessionCode,
                    session_type: "co-edit",
                    session_purpose: "inventory_management",
                    created_by: userEmail,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                })
                .select()
                .single();

            if (error) throw error;

            // Add self as participant
            await supabase
                .from("warehouse_collaboration_participants")
                .insert({
                    session_id: session.id,
                    user_email: userEmail,
                    role: "owner",
                    status: "active",
                    current_view: "dashboard",
                });

            setActiveSession(session);
            toast.success(`Session created: ${sessionCode}`);

            // Subscribe to realtime updates
            subscribeToSession(session.id);
        } catch (error) {
            console.error("Start session error:", error);
            toast.error("Failed to start session");
        } finally {
            setIsLoading(false);
        }
    };

    // Join existing session
    const joinSession = async () => {
        if (!joinCode) return;

        setIsLoading(true);
        try {
            // Find session by code
            const { data: session, error: findError } = await supabase
                .from("warehouse_collaboration_sessions")
                .select("*")
                .eq("session_code", joinCode.toUpperCase())
                .eq("is_active", true)
                .single();

            if (findError || !session) {
                toast.error("Session not found or expired");
                return;
            }

            // Check if already a participant
            const { data: existing } = await supabase
                .from("warehouse_collaboration_participants")
                .select("id")
                .eq("session_id", session.id)
                .eq("user_email", userEmail)
                .single();

            if (existing) {
                // Update status
                await supabase
                    .from("warehouse_collaboration_participants")
                    .update({ status: "active", joined_at: new Date().toISOString() })
                    .eq("id", existing.id);
            } else {
                // Add as new participant
                await supabase
                    .from("warehouse_collaboration_participants")
                    .insert({
                        session_id: session.id,
                        user_email: userEmail,
                        role: "editor",
                        status: "active",
                        current_view: "dashboard",
                    });
            }

            setActiveSession(session);
            setJoinCode("");
            toast.success(`Joined session: ${session.session_code}`);

            // Subscribe to realtime updates
            subscribeToSession(session.id);

            // Broadcast presence immediately (Fallback if DB Realtime is slow/off)
            setTimeout(() => {
                const channel = supabase.channel(`collab-broadcast-${session.id}`);
                channel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        channel.send({
                            type: 'broadcast',
                            event: 'activity',
                            payload: { message: `${userEmail.split("@")[0]} joined the session` },
                        });
                    }
                });
            }, 1000);

        } catch (error) {
            console.error("Join session error:", error);
            toast.error("Failed to join session");
        } finally {
            setIsLoading(false);
        }
    };

    // End session
    const endSession = async () => {
        if (!activeSession) return;

        try {
            // Remove self as participant
            await supabase
                .from("warehouse_collaboration_participants")
                .update({ status: "disconnected" })
                .eq("session_id", activeSession.id)
                .eq("user_email", userEmail);

            // If owner, close the session
            if (activeSession.created_by === userEmail) {
                await supabase
                    .from("warehouse_collaboration_sessions")
                    .update({ is_active: false })
                    .eq("id", activeSession.id);
            }

            setActiveSession(null);
            setParticipants([]);
            setActivities([]);
            toast.success("Left session");
        } catch (error) {
            console.error("End session error:", error);
        }
    };

    // Subscribe to session updates
    const subscribeToSession = (sessionId) => {
        // Fetch initial participants
        supabase
            .from("warehouse_collaboration_participants")
            .select("*")
            .eq("session_id", sessionId)
            .in("status", ["active", "idle"])
            .then(({ data }) => {
                setParticipants(data || []);
            });

        // Realtime subscription for participants
        const participantChannel = supabase
            .channel(`collab-participants-${sessionId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "warehouse_collaboration_participants",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setParticipants(prev => [...prev, payload.new]);
                        addActivity(`${payload.new.user_email.split("@")[0]} joined`);
                    } else if (payload.eventType === "UPDATE") {
                        setParticipants(prev =>
                            prev.map(p => p.id === payload.new.id ? payload.new : p)
                        );
                        if (payload.new.status === "disconnected") {
                            addActivity(`${payload.new.user_email.split("@")[0]} left`);
                        }
                    } else if (payload.eventType === "DELETE") {
                        setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Presence channel for real-time updates
        const presenceChannel = supabase
            .channel(`collab-presence-${sessionId}`)
            .on("presence", { event: "sync" }, () => {
                // Presence sync logic if needed
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await presenceChannel.track({
                        user_email: userEmail,
                        current_view: "dashboard",
                        online_at: new Date().toISOString(),
                    });
                }
            });

        // Broadcast channel for ephemeral events (scans, navigation)
        // This is "Activity Broadcasting" - no DB storage, just instant peer-to-peer msgs
        const broadcastChannel = supabase
            .channel(`collab-broadcast-${sessionId}`)
            .on(
                "broadcast",
                { event: "activity" },
                (payload) => {
                    // Receive broadcast from others
                    addActivity(payload.payload.message);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(participantChannel);
            supabase.removeChannel(presenceChannel);
            supabase.removeChannel(broadcastChannel);
        };
    };

    // Add activity to feed (local only)
    const addActivity = (message) => {
        setActivities(prev => [
            { message, timestamp: new Date().toISOString() },
            ...prev.slice(0, 49),
        ]);
    };

    // Broadcast action to other participants (The "Advanced" Feature)
    const broadcast = async (action, data = {}) => {
        if (!activeSession) return;

        // Message to show
        let message = `Unknown action`;
        if (action === "scan") {
            message = `${userEmail.split("@")[0]} scanned ${data.item || "item"}`;
        } else if (action === "nav") {
            message = `${userEmail.split("@")[0]} viewing ${data.view}`;
        }

        // Add to own feed
        addActivity(`You: ${action === "scan" ? `scanned ${data.item}` : action}`);

        // Send to everyone else
        const channel = supabase.channel(`collab-broadcast-${activeSession.id}`);
        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.send({
                    type: 'broadcast',
                    event: 'activity',
                    payload: { message: message },
                });
            }
        });
    };

    // Update presence (current view, status)
    const updatePresence = async (view, status = "active") => {
        if (!activeSession) return;

        await supabase
            .from("warehouse_collaboration_participants")
            .update({
                current_view: view,
                status,
                last_activity: new Date().toISOString()
            })
            .eq("session_id", activeSession.id)
            .eq("user_email", userEmail);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (activeSession) {
                supabase
                    .from("warehouse_collaboration_participants")
                    .update({ status: "disconnected" })
                    .eq("session_id", activeSession.id)
                    .eq("user_email", userEmail);
            }
        };
    }, [activeSession, userEmail]);

    return {
        activeSession,
        participants,
        activities,
        isLoading,
        joinCode,
        setJoinCode,
        startSession,
        joinSession,
        endSession,
        broadcast,
        updatePresence,
    };
}
