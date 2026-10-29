import React from 'react';
import { usePortal } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import DepositPortfolio from './components/DepositPortfolio';
import FdrIngestionOcr from './components/FdrIngestionOcr';
import BankCbsGateway from './components/BankCbsGateway';
import MaturityEscalation from './components/MaturityEscalation';
import ReleaseWorkflow from './components/ReleaseWorkflow';
import AuditLedgerExplorer from './components/AuditLedgerExplorer';
import FdrDetailDrawer from './components/FdrDetailDrawer';
import JudicialStayModal from './components/JudicialStayModal';

export default function App() {
  const { currentView, loading } = usePortal();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Official Gov Header */}
      <Header />

      {/* Main Framework Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Operations Sidebar */}
        <Sidebar />

        {/* Dynamic Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 font-mono text-xs text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading AICTE Security Deposit Subsystem...</span>
                </div>
              </div>
            ) : (
              <>
                {currentView === 'dashboard' && <DashboardOverview />}
                {currentView === 'portfolio' && <DepositPortfolio />}
                {currentView === 'ingestion' && <FdrIngestionOcr />}
                {currentView === 'cbs' && <BankCbsGateway />}
                {currentView === 'maturity' && <MaturityEscalation />}
                {currentView === 'release' && <ReleaseWorkflow />}
                {currentView === 'audit' && <AuditLedgerExplorer />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Flyout Inspection Drawer */}
      <FdrDetailDrawer />

      {/* High Court Injunction Modal */}
      <JudicialStayModal />
    </div>
  );
}
