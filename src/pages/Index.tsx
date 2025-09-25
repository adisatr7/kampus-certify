import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Dashboard from "./Dashboard";
import { useAuth } from "@/lib/auth";

const Index = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <LoginPage />;
  }

  return (
    <DashboardLayout userRole={userProfile.role}>
      <Dashboard userRole={userProfile.role} />
    </DashboardLayout>
  );
};

export default Index;
