import React, { createContext, useContext, useState, useEffect } from 'react';
import { fdrApiService, auditLedgerService, judicialInjunctionService, releaseWorkflowService } from '../services/api';

const AppContext = createContext();

export const ROLES = [
  { id: 'Trustee', label: 'Trustee / Institution', badge: 'INSTITUTION_DESK', jurisdiction: 'Maharashtra Institute of Technology' },
  { id: 'Regional Officer', label: 'AICTE Regional Officer', badge: 'RO_WEST_MUMBAI', jurisdiction: 'Western Regional Office (WRO)' },
  { id: 'Bank Nodal', label: 'Bank Nodal Officer', badge: 'SBI_CBS_NODAL', jurisdiction: 'State Bank of India (CP Branch)' },
  { id: 'Member Secretary', label: 'Member Secretary / HQ', badge: 'AICTE_HQ_EXECUTIVE', jurisdiction: 'Nelson Mandela Marg, New Delhi' },
];

export function AppProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(ROLES[1].id); // Default to Regional Officer
  const [currentView, setCurrentView] = useState('dashboard');
  const [fdrs, setFdrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFdr, setSelectedFdr] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stayModalOpen, setStayModalOpen] = useState(false);
  const [stayModalTargetFdr, setStayModalTargetFdr] = useState(null);
  const [istTime, setIstTime] = useState('');
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'T-90 Maturity Approaching',
      detail: 'Canara Bank FDR (₹25,00,000) maturing within 26 days. Institution notice dispatched.',
      timestamp: '10 mins ago',
      level: 'warning',
      unread: true
    },
    {
      id: 'notif-2',
      title: 'Judicial Stay Active',
      detail: 'High Court WP(C)/9421/2023 injunction in force for Bank of Baroda deposit.',
      timestamp: '1 hour ago',
      level: 'danger',
      unread: true
    },
    {
      id: 'notif-3',
      title: 'CBS Irrevocable Lien Confirmed',
      detail: 'State Bank of India confirmed lien under ref LIEN-SBI-2023-0012 via SFMS MT760.',
      timestamp: '4 hours ago',
      level: 'success',
      unread: false
    }
  ]);

  // Live IST Clock calculation
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      // Format in IST
      const options = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      const formatter = new Intl.DateTimeFormat('en-IN', options);
      setIstTime(formatter.format(now) + ' IST');
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial Data Fetch
  const loadPortalData = async () => {
    setLoading(true);
    try {
      const { data: fdrList } = await fdrApiService.getFdrs();
      setFdrs(fdrList);
      const { data: statsData } = await fdrApiService.getDashboardStats();
      setStats(statsData);
      if (!selectedFdr && fdrList.length > 0) {
        setSelectedFdr(fdrList[0]);
      }
    } catch (err) {
      console.error("Failed to load portal data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Action handlers
  const handleOpenDetailDrawer = (fdr) => {
    setSelectedFdr(fdr);
    setDrawerOpen(true);
  };

  const handleCloseDetailDrawer = () => {
    setDrawerOpen(false);
  };

  const handleTriggerStayModal = (fdr = null) => {
    setStayModalTargetFdr(fdr || selectedFdr || fdrs[0]);
    setStayModalOpen(true);
  };

  const handleCloseStayModal = () => {
    setStayModalOpen(false);
  };

  const handleFdrUpdated = (updatedFdr) => {
    setFdrs(prev => prev.map(f => f.id === updatedFdr.id ? updatedFdr : f));
    if (selectedFdr && selectedFdr.id === updatedFdr.id) {
      setSelectedFdr(updatedFdr);
    }
    fdrApiService.getDashboardStats().then(res => setStats(res.data));
  };

  const handleDismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentView,
        setCurrentView,
        fdrs,
        setFdrs,
        stats,
        setStats,
        loading,
        selectedFdr,
        setSelectedFdr,
        drawerOpen,
        handleOpenDetailDrawer,
        handleCloseDetailDrawer,
        stayModalOpen,
        stayModalTargetFdr,
        handleTriggerStayModal,
        handleCloseStayModal,
        handleFdrUpdated,
        istTime,
        notifications,
        handleDismissNotification,
        refreshPortalData: loadPortalData
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('usePortal must be used within an AppProvider');
  }
  return context;
}
