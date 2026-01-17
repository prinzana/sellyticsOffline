import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Shield, ArrowRight, Loader2, Warehouse } from "lucide-react";

export default function PortalLogin({ portalData, onVerify, loading }) {
    const [email, setEmail] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email.trim()) {
            onVerify(email.trim());
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo / Brand Area */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg ring-1 ring-white/20">
                            <Warehouse className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">Sellytics Portal</span>
                    </div>
                    <p className="text-indigo-200/60 text-sm">Secure Client Inventory Access</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Verify Access</h1>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Welcome to the <span className="text-indigo-300 font-semibold">{portalData?.warehouse?.name}</span> portal.
                            Please enter your email to continue.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                                Authorized Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading || !email}
                            className="w-full group relative py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all overflow-hidden"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Access Dashboard
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Secure End-to-End Encryption
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-500 text-xs">
                    Invited as <span className="text-slate-400 font-medium">{portalData?.client?.client_name}</span>.
                    Trouble logging in? Contact the warehouse admin.
                </p>
            </motion.div>
        </div>
    );
}
