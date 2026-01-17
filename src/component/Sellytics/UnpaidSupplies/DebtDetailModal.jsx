import React, { useState, useEffect } from 'react';
import { FaTimes, FaCommentAlt } from 'react-icons/fa';
import useDebtWithOffline from './useDebtWithOffline';
import { useCurrency } from '../../context/currencyContext';

export default function DebtDetailModal({ debt: initialDebt, onClose }) {
  const { fetchDebts, updateDebt } = useDebtWithOffline();
  const { formatPrice } = useCurrency();

  const [debt, setDebt] = useState(initialDebt);
  const [isReturned, setIsReturned] = useState(initialDebt.is_returned || false);
  const [remark, setRemark] = useState(initialDebt.remark || '');
  const [isSaving, setIsSaving] = useState(false);

  const balance = (debt.owed || 0) - (debt.deposited || 0);
  const isPaid = balance <= 0;
  const isPartial = debt.deposited > 0 && balance > 0;

  const hasImeis = debt.device_id && debt.device_id.trim() !== '';
  const deviceIds = hasImeis ? debt.device_id.split(',').map(s => s.trim()) : [];
  const deviceSizes = hasImeis
    ? (debt.device_sizes || '').split(',').map(s => s.trim())
    : [];

  /* Auto-save return status & remark */
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasChanged =
        isReturned !== initialDebt.is_returned ||
        remark !== (initialDebt.remark || '');

      if (hasChanged) {
        setIsSaving(true);
        try {
          await updateDebt(debt.id, {
            is_returned: isReturned,
            remark: isReturned ? remark.trim() : '',
          });

          setDebt(prev => ({
            ...prev,
            is_returned: isReturned,
            remark: isReturned ? remark : '',
          }));

          fetchDebts();
        } catch (err) {
          console.error("Auto-save failed:", err);
          // Rollback UI state on error
          setIsReturned(initialDebt.is_returned);
          setRemark(initialDebt.remark || '');
        } finally {
          setIsSaving(false);
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [
    isReturned,
    remark,
    debt.id,
    updateDebt,
    fetchDebts,
    initialDebt.is_returned,
    initialDebt.remark,
  ]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white truncate">
            {debt.product_name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600">
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs sm:text-sm">

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 dark:text-gray-300">
            <div><span className="font-medium">Customer:</span> {debt.customer_name}</div>
            <div><span className="font-medium">Phone:</span> {debt.phone_number || '—'}</div>
            <div><span className="font-medium">Supplier:</span> {debt.supplier || '—'}</div>
            <div><span className="font-medium">Date:</span> {new Date(debt.date).toLocaleDateString()}</div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <p className="text-[10px] text-gray-500">Qty</p>
              <p className="text-sm font-bold text-blue-700">{debt.qty}</p>
            </div>

            <div className="bg-purple-50 dark:bg-indigo-900/20 p-2 rounded">
              <p className="text-[10px] text-gray-500">Owed</p>
              <p className="text-sm font-bold">
                {formatPrice(debt.owed || 0)}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
              <p className="text-[10px] text-gray-500">Paid</p>
              <p className="text-sm font-bold text-green-700">
                {formatPrice(debt.deposited || 0)}
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
              <p className="text-[10px] text-gray-500">Balance</p>
              <p className="text-sm font-bold text-red-700">
                {formatPrice(balance)}
              </p>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex justify-center">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${isPaid
                ? 'bg-green-100 text-green-700'
                : isPartial
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
                }`}
            >
              {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
            </span>
          </div>

          {/* Return Status */}
          <div className="border-t pt-3">
            <p className="font-semibold mb-2 text-xs">Returned?</p>

            <div className="flex justify-center gap-6">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  checked={isReturned}
                  onChange={() => setIsReturned(true)}
                />
                <span>Yes</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  checked={!isReturned}
                  onChange={() => setIsReturned(false)}
                />
                <span>No</span>
              </label>
            </div>

            {isReturned && (
              <div className="mt-3">
                <div className="flex items-center gap-1 text-orange-700 mb-1">
                  <FaCommentAlt size={12} />
                  <span className="font-medium text-xs">Reason</span>
                  {isSaving && <span className="text-[10px]">(saving)</span>}
                </div>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Reason for return"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-orange-400 outline-none resize-none text-xs"
                  rows={2}
                />
              </div>
            )}

            {!isReturned && debt.remark && (
              <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                <p className="font-medium text-gray-600 dark:text-gray-300">
                  Previous remark:
                </p>
                <p className="italic">"{debt.remark}"</p>
              </div>
            )}
          </div>

          {/* IMEI List */}
          {hasImeis && deviceIds.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-semibold mb-2 text-xs">
                Product IDs ({deviceIds.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {deviceIds.map((id, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-[11px] font-mono text-center"
                  >
                    {id}
                    {deviceSizes[i] && (
                      <div className="text-[10px] text-gray-500">
                        ({deviceSizes[i]})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 text-white rounded-md text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
