// ReceivableCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Package, Phone, Calendar, TrendingUp } from 'lucide-react';
import { useCurrency } from '../../../context/currencyContext';

export default function ReceivableCard({ entry, onViewCustomer }) {
  const { formatPrice } = useCurrency();

  const daysOverdue = Math.floor((new Date() - new Date(entry.date)) / (1000 * 60 * 60 * 24));

  // Calculate remaining balance
  const remainingBalance = entry.remaining_balance ||
    ((parseFloat(entry.owed) || 0) - (parseFloat(entry.deposited) || 0));

  // Calculate payment progress
  const paymentProgress = entry.owed > 0
    ? ((parseFloat(entry.deposited) || 0) / (parseFloat(entry.owed) || 1)) * 100
    : 0;

  // Determine aging severity
  const getAgingSeverity = (days) => {
    if (days <= 30) return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Current' };
    if (days <= 60) return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Warning' };
    if (days <= 90) return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Overdue' };
    return { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-200 dark:bg-red-900/50', label: 'Critical' };
  };

  const agingSeverity = getAgingSeverity(daysOverdue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 hover:shadow-lg transition-all relative cursor-pointer group"
      onClick={() => onViewCustomer()}
    >
      {/* Aging Badge */}
      <div className="absolute top-3 right-3">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${agingSeverity.bg} ${agingSeverity.color}`}>
          {agingSeverity.label}
        </span>
      </div>

      {/* Top row: Icon + Customer Info */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <Package className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
            {entry.customer_name}
          </h3>

          {entry.phone_number && (
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <Phone className="w-3 h-3" />
              <span>{entry.phone_number}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(entry.date).toLocaleDateString()}</span>
            <span className="mx-1">•</span>
            <span className={agingSeverity.color}>{daysOverdue} days overdue</span>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Product</p>
        <p className="font-medium text-slate-900 dark:text-white truncate">
          {entry.product_name || 'N/A'}
        </p>
        {entry.qty > 1 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quantity: {entry.qty}
          </p>
        )}
        {entry.device_id && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
            ID: {entry.device_id}
          </p>
        )}
      </div>

      {/* Financial Info Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Owed</p>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">
            {formatPrice(entry.owed)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Paid</p>
          <p className="font-semibold text-green-600 dark:text-green-400 text-sm">
            {formatPrice(entry.deposited || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Balance</p>
          <p className="font-bold text-red-600 dark:text-red-400 text-sm">
            {formatPrice(remainingBalance)}
          </p>
        </div>
      </div>

      {/* Payment Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Payment Progress
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {paymentProgress.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(paymentProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Additional Info Footer */}
      {(entry.supplier || entry.is_returned) && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          {entry.supplier && (
            <span className="text-slate-500 dark:text-slate-400">
              Supplier: <span className="font-medium text-slate-700 dark:text-slate-300">{entry.supplier}</span>
            </span>
          )}
          {entry.is_returned && (
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md font-medium">
              Returned
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}