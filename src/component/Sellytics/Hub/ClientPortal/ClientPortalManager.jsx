import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PortalLogin from "./PortalLogin";
import ClientDashboard from "./ClientDashboard";
import { useClientPortal } from "../enterprise/hooks/useClientPortal";
import { Loader2 } from "lucide-react";

export default function ClientPortalManager() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { validateToken, verifyEmail, loading, portalData, session, submitDispatchRequest, fetchProductSerials, fetchProductHistory } = useClientPortal();

    const [isValidating, setIsValidating] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            const success = await validateToken(token);
            if (!success) {
                setError("Invalid or expired invitation link.");
            }
            setIsValidating(false);
        };
        init();
    }, [token, validateToken]);

    if (isValidating || (loading && !portalData)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Securing access...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        ⚠️
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate("/")}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {!session ? (
                <PortalLogin
                    portalData={portalData}
                    onVerify={verifyEmail}
                    loading={loading}
                />
            ) : (
                <ClientDashboard
                    portalData={portalData}
                    session={session}
                    onDispatchRequest={submitDispatchRequest}
                    fetchProductSerials={fetchProductSerials}
                    fetchProductHistory={fetchProductHistory}
                    isSubmitting={loading}
                />
            )}
        </div>
    );
}
