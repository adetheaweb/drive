import React from 'react';
import type { User } from 'firebase/auth';
import { LogOut, Cloud, HardDrive, AlertTriangle } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import type { StorageQuota } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  quota: StorageQuota | null;
  isLoadingQuota: boolean;
}

export default function Navbar({ user, onLogout, quota, isLoadingQuota }: NavbarProps) {
  return (
    <header id="app-navbar" className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/10">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight tracking-tight text-slate-900 sm:text-xl">
                Drive<span className="text-blue-600">Sync</span>
              </h1>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">
                Google Workspaces
              </p>
            </div>
          </div>

          {/* Right Section: Storage Quota & User Profile */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            
            {/* Storage Quota widget - hidden on mobile, shown on SM+ */}
            {quota && (
              <div className="hidden md:flex flex-col text-right max-w-48 xl:max-w-64">
                <div className="flex items-center justify-end space-x-2 text-xs font-semibold text-slate-600 mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Penyimpanan: {formatBytes(quota.usage)} / {formatBytes(quota.limit)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      quota.percentage > 90
                        ? 'bg-red-500'
                        : quota.percentage > 75
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${quota.percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Terpakai {quota.percentage}% ({formatBytes(quota.limit - quota.usage)} tersisa)
                </span>
              </div>
            )}

            {/* Profile Card & Logout */}
            <div className="flex items-center pl-4 border-l border-slate-200 space-x-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  alt={user.displayName || 'Pengguna'}
                  className="w-10 h-10 rounded-full border border-slate-200 shadow-inner object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                  {user.displayName}
                </p>
                <p className="text-xs text-slate-400 line-clamp-1">
                  {user.email}
                </p>
              </div>

              <button
                id="btn-logout"
                onClick={onLogout}
                className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 p-2 rounded-lg border border-slate-200 transition-colors duration-150 tooltip"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Mobile Storage Quota widget - visible below md */}
      {quota && (
        <div className="md:hidden px-4 pb-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1 pt-2">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Drive Penyimpanan</span>
            </span>
            <span>{quota.percentage}% ({formatBytes(quota.usage)} dari {formatBytes(quota.limit)})</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                quota.percentage > 90 ? 'bg-red-500' : quota.percentage > 75 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${quota.percentage}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
