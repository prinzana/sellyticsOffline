import { useEffect, useRef, useState } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";

export function RowMenu({ onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => setOpen((v) => !v)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
                <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-20">
                    <button
                        onClick={() => {
                            setOpen(false);
                            onEdit();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </button>

                    <button
                        onClick={() => {
                            setOpen(false);
                            onDelete();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}
