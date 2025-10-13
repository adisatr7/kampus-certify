import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { LoginPage } from "./LoginPage";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  console.log("🛡️ ProtectedRoute - Loading:", loading, "User:", !!user, "Profile:", userProfile);
  console.log("🛡️ ProtectedRoute - Allowed roles:", allowedRoles);

  if (loading) {
    console.log("🛡️ ProtectedRoute - Still loading, showing spinner");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    console.log("🛡️ ProtectedRoute - No user or profile, redirecting to login");
    return <LoginPage />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    console.log("🛡️ ProtectedRoute - Role check failed:", {
      userRole: userProfile.role,
      allowedRoles,
      includes: allowedRoles.includes(userProfile.role),
    });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground">
            Anda tidak memiliki akses ke halaman ini. Role Anda: {userProfile.role}
          </p>
        </div>
      </div>
    );
  }

  console.log("🛡️ ProtectedRoute - Access granted, rendering children");

  return <>{children}</>;
}
