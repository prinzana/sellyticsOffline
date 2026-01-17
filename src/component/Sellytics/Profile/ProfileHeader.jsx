// src/components/store-owner/ProfileHeader.jsx
import React from 'react';
import { FaSignOutAlt } from 'react-icons/fa';

const ProfileHeader = ({ storeDetails, handleLogout }) => {
  return (
    <div className="max-w-4xl mx-auto px-1">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-3xl p-6 sm:p-8 text-center text-white mb-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

        <div className="absolute top-4 right-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition text-xs sm:text-sm font-medium"
          >
            <FaSignOutAlt />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-bold mb-1">{storeDetails.shop_name || 'My Store'}</h1>
          <p className="text-white/80 text-sm sm:text-base italic">Store Owner Profile</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;