import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useImportParser } from "./useImportParser";
import { useImportValidation } from "./useImportValidation";
import { useImportRunner } from "./useImportRunner";

import UploadStep from "./UploadStep";
import MapColumnsStep from "./MapColumnsStep";
import ValidateStep from "./ValidateStep";
import CompleteStep from "./CompleteStep";

const STEPS = [
    { id: 1, title: "Upload" },
    { id: 2, title: "Map Columns" },
    { id: 3, title: "Preview" },
    { id: 4, title: "Import" },
];

export default function ImportWizard({ warehouseId, clientId, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const fileInputRef = useRef(null);

    const parser = useImportParser();
    const validator = useImportValidation(parser.parsedData, parser.columnMapping);
    const runner = useImportRunner({ warehouseId, clientId });

    const validationResults = step >= 3 ? validator.validate() : null;

    // Portal: Lock body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    const content = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-indigo-900 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Batch Import Products
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Steps Indicator */}
                <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between max-w-2xl mx-auto">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className="flex items-center">
                                <div className={`flex items-center gap-2 ${step >= s.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= s.id
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-slate-300 dark:border-slate-600 text-slate-400"
                                        }`}>
                                        {s.id}
                                    </div>
                                    <span className="text-sm font-medium hidden sm:block">{s.title}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`w-12 h-0.5 mx-2 transition-colors ${step > s.id ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area (Scrollable) */}
                <div className="p-6 overflow-y-auto flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            <>
                                {step === 1 && (
                                    <UploadStep
                                        fileInputRef={fileInputRef}
                                        onDrop={(e) => parser.handleFileSelect(e.dataTransfer.files[0], () => setStep(2))}
                                        onSelect={(f) => parser.handleFileSelect(f, () => setStep(2))}
                                    />
                                )}

                                {step === 2 && (
                                    <MapColumnsStep {...parser} onNext={() => setStep(3)} onBack={() => setStep(1)} />
                                )}

                                {step === 3 && (
                                    <ValidateStep
                                        results={validationResults}
                                        progress={runner.progress}
                                        isImporting={runner.isRunning}
                                        onBack={() => setStep(2)}
                                        onImport={async () => {
                                            await runner.runImport(validationResults.valid);
                                            setStep(4);
                                        }}
                                    />
                                )}

                                {step === 4 && <CompleteStep results={runner.results} onDone={() => { onSuccess?.(); onClose(); }} />}
                            </>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );

    return createPortal(content, document.body);
}
