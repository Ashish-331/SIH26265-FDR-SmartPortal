import React, { useState } from 'react';
import { usePortal, ROLES } from '../context/AppContext';
import EmblemCrest from './common/EmblemCrest';
import { 
  Bell, 
  Search, 
  Clock, 
  ShieldCheck, 
  ChevronDown, 
  UserCheck, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Server
} from 'lucide-react';

export default function Header() {
  const { 
    currentRole, 
    setCurrentRole, 
    istTime, 
    notifications, 
    handleDismissNotification,
    handleTriggerStayModal 
  } = usePortal();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeRoleConfig = ROLES.find(r => r.id === currentRole) || ROLES[1];
  const unreadCount = notifications.filter(n => n.unread).length;

  const handleRoleSelectionSwitch = (roleId) => {
    setCurrentRole(roleId);
    setRoleDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-tactile">
      {/* Top Sovereign Gov Bar */}
      <div className="bg-slate-950 px-4 py-1 text-[11px] text-slate-400 flex flex-wrap items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">
            भारत सरकार | Government of India
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Ministry of Education — Technical Education Bureau
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-emerald-400">
            <Server className="w-3 h-3" />
            <span className="text-[10px] uppercase font-bold tracking-wider">NIC MEGHRAJ CLOUD</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="font-medium">{istTime || '12:00:00 PM IST'}</span>
          </div>

          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950/80 text-blue-300 border border-blue-800">
            ENV: PRODUCTION-SECURE
          </span>
        </div>
      </div>

      {/* Main Tactical Nav Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Emblem & Portal Identity */}
        <EmblemCrest size="md" />

        {/* Universal Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by FDR No (e.g. SBI-FDR-778899), IFSC, Institution, or UTR..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/70 text-slate-200 placeholder-slate-500 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Section: Role Switcher & Notifications */}
        <div className="flex items-center gap-3">
          {/* Quick Stay Injector Shortcut */}
          <button
            onClick={() => handleTriggerStayModal()}
            title="Simulate High Court Stay Injunction"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-red-950/70 text-red-300 border border-red-800 hover:bg-red-900/60 transition shadow-tactile font-medium"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate Court Injunction</span>
          </button>

          {/* Role Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-100 shadow-tactile transition"
            >
              <div className="w-7 h-7 rounded-md bg-blue-900/80 border border-blue-700 flex items-center justify-center text-blue-300">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold leading-tight text-white flex items-center gap-1.5">
                  <span>{activeRoleConfig.label}</span>
                  <span className="text-[9px] px-1 py-0.2 bg-blue-950 text-blue-300 font-mono rounded border border-blue-800">
                    {activeRoleConfig.badge}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {activeRoleConfig.jurisdiction}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Role Switch Dropdown */}
            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-tactile-lg py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Switch Active Governance Role
                </div>
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelectionSwitch(role.id)}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-slate-800 transition ${
                      role.id === currentRole ? 'bg-slate-800/90 text-blue-400' : 'text-slate-200'
                    }`}
                  >
                    <div className="mt-0.5">
                      <ShieldCheck className={`w-4 h-4 ${role.id === currentRole ? 'text-blue-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{role.label}</div>
                      <div className="text-[11px] text-slate-400">{role.jurisdiction}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">{role.badge}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Bell Button */}
          <div className="relative">
            <button
              onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition"
              title="Official Alerts & Telemetry"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Flyout Drawer */}
            {notifDrawerOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700 shadow-tactile-lg z-50 p-3">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Regulatory Advisories
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 text-blue-300 font-mono">
                      {notifications.length} Alerts
                    </span>
                  </div>
                  <button
                    onClick={() => setNotifDrawerOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border text-xs flex gap-2.5 items-start relative ${
                        item.level === 'danger'
                          ? 'bg-red-950/40 border-red-800 text-red-200'
                          : item.level === 'warning'
                          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                          : 'bg-slate-800/70 border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.level === 'danger' ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : item.level === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Info className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-xs flex items-center justify-between">
                          <span>{item.title}</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.timestamp}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {item.detail}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissNotification(item.id)}
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
