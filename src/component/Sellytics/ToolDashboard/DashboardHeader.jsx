// src/components/dashboard/DashboardHeader.jsx
import { FaCrown, FaTimes } from 'react-icons/fa';

export default function DashboardHeader({
  shopName,
  isPremium,
  errorMessage,
  setErrorMessage,
  fetchAllowedFeatures,
}) {
  return (
    <>
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        <div className="relative max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div>
              <div className="inline-flex gap-2 px-3 py-1.5 bg-white/10 rounded-full text-white text-xs font-semibold mb-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                System Online
              </div>
              <h1 className="text-xl sm:text-3xl font-bold text-white">
                Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">{shopName}</span>
              </h1>
              <p className="text-slate-300 text-xs mt-0.5">Manage your store with ease</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  localStorage.removeItem(`features_${localStorage.getItem('store_id')}`);
                  fetchAllowedFeatures();
                }}
                className="group flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-200"
                title="Refresh Permissions"
              >
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {!isPremium && (
                <a
                  href="/upgrade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-lg shadow-lg"
                >
                  Upgrade Pro
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Banner */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <FaCrown className="text-2xl text-amber-500" />
              <div>
                <p className="font-bold">Unlock all features</p>
                <p className="text-sm text-slate-600">Advanced analytics, multi-store & more</p>
              </div>
            </div>
            <a href="/upgrade" className="px-5 py-2 bg-amber-600 text-white rounded-lg">View Plans</a>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex justify-between">
            <div>
              <h4 className="font-semibold text-red-800">Access Restricted</h4>
              <p className="text-red-700">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-red-600">
              <FaTimes size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}