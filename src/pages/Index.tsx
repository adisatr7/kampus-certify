import { useState } from "react";
import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Dashboard from "./Dashboard";
import PublicVerify from "./PublicVerify";

const Index = () => {
  // Simulasi state autentikasi - dalam implementasi sesungguhnya akan menggunakan Supabase Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'dosen' | 'rektor' | 'dekan'>('admin');
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'verify'>('login');

  // Mock login function - akan diganti dengan Supabase Auth
  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  // Untuk demo, kita bisa switch antara views
  if (currentView === 'verify' || window.location.pathname === '/verify') {
    return <PublicVerify />;
  }

  if (!isAuthenticated || currentView === 'login') {
    return (
      <div>
        <LoginPage />
        {/* Demo buttons untuk development */}
        <div className="fixed bottom-4 right-4 flex gap-2 z-50">
          <button
            onClick={() => setCurrentView('verify')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 text-sm"
          >
            Portal Verifikasi
          </button>
          <button
            onClick={handleLogin}
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700 text-sm"
          >
            Demo Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole}>
      <Dashboard userRole={userRole} />
    </DashboardLayout>
  );
};

export default Index;
