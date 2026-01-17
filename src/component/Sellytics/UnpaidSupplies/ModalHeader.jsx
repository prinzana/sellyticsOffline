
import { WifiOff, Plus, X } from 'lucide-react';
const ModalHeader = ({ isEdit, isOnline, onClose }) => {
    return (
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {isEdit ? '📝 Edit Debt Entry' : 'Record New Debt'}
                        </h2>
                        {!isOnline && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                                <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Offline</span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500">
                        {isEdit
                            ? 'Update existing debt entries'
                            : 'Add new debt entries for customers'}
                    </div>
                </div>
            </div>
            <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

export default ModalHeader;

