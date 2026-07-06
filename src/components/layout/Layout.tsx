import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { HeaderMobile } from './HeaderMobile';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { AppointmentNotifier } from '../notifications/AppointmentNotifier';

export function Layout() {
  const { user, loading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg-base flex transition-colors text-text-main relative overflow-x-hidden">
      <AppointmentNotifier />

      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      <div className={`flex-1 flex flex-col min-h-screen relative overflow-x-hidden transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[240px]'
      }`}>
        <HeaderMobile />
        <Header />
        <main className="flex-1 p-4 lg:p-8 pb-[80px] lg:pb-8 transition-all relative">
          <div className="pb-safe-area-bottom">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
