// src/components/dashboard/ToolCard.jsx
import React from 'react';
import { FaCrown, FaChevronRight, FaLock } from 'react-icons/fa';

const ToolCard = ({ tool, isPremium, allowedFeatures, onClick }) => {
  const isAccessible = (tool.isFreemium || isPremium) && allowedFeatures.includes(tool.key);
  const Icon = tool.icon;

  return (
    <div
      onClick={() => isAccessible && onClick(tool.key)}
      className={`group relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3 transition-all duration-200 ${isAccessible
          ? 'cursor-pointer hover:shadow-md hover:shadow-indigo-500/10 hover:-translate-y-0.5 hover:border-indigo-400 dark:hover:border-indigo-600'
          : 'cursor-not-allowed opacity-50'
        }`}
    >
      {!tool.isFreemium && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 text-amber-700 dark:text-amber-400 rounded text-[9px] font-bold border border-amber-200 dark:border-amber-800">
            <FaCrown className="text-[8px]" />
            <span>PRO</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 transition-all duration-200 ${isAccessible ? 'group-hover:scale-105' : ''
          }`}>
          <Icon className="text-lg text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="flex-1 text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
          {tool.label}
        </h3>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight mb-2">
        {tool.desc}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[9px] font-medium">
          {tool.category}
        </span>
        {isAccessible && (
          <FaChevronRight className="text-[10px] text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200" />
        )}
      </div>

      {!isAccessible && (
        <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="text-center px-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 mb-1">
              <FaLock className="text-sm text-red-600 dark:text-red-400" />
            </div>
            <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200">
              {!allowedFeatures.includes(tool.key) ? 'Contact Admin' : 'Upgrade'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolCard;