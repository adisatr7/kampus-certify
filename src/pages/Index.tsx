import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "./Dashboard";
import PublicVerify from "./PublicVerify";

const Index = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState(null);

  // Check session and set up auth state listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Failed to get session");
        } else {
          setSession(session);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError("Failed to initialize authentication");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      setSession(session);

      // Clear user role when session changes
      if (!session) {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user role when session is available
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session?.user?.id) {
        setUserRole(null);
        return;
      }

      try {
        setError(null);

        // Check if user exists in the users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role, name, email")
          .eq("id", session.user.id)
          .maybeSingle();

        if (userError) {
          console.error("Error fetching user role:", userError);
          setError("Terjadi kesalahan saat mengambil data pengguna");
          // Sign out user if there's an error
          await supabase.auth.signOut();
          return;
        }

        if (!userData) {
          // User not registered in system
          console.log("User not found in database - access denied");
          setError(
            "Email Anda tidak terdaftar dalam sistem CA UMC. Silakan hubungi administrator untuk mendaftarkan akun Anda.",
          );
          // Sign out user
          await supabase.auth.signOut();
          return;
        }

        // User found, set role and log login
        setUserRole(userData.role);

        // Update last login in audit trail
        await supabase.rpc("create_audit_entry", {
          p_user_id: session.user.id,
          p_action: "user_login",
          p_description: `User logged in: ${userData.name}`,
        });
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Terjadi kesalahan yang tidak terduga");
        await supabase.auth.signOut();
      }
    };

    fetchUserRole();
  }, [session]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert
          variant="destructive"
          className="max-w-md"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}. Silakan refresh halaman atau hubungi administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle public verification route
  if (window.location.pathname === "/verify") {
    return <PublicVerify />;
  }

  // Not authenticated
  if (!session) {
    return <LoginPage />;
  }

  // User role not yet loaded or error
  if (!userRole) {
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Alert
            variant="destructive"
            className="max-w-md"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. Silakan refresh halaman atau hubungi administrator.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat profil pengguna...</p>
        </div>
      </div>
    );
  }

  // Authenticated with role - show dashboard
  return (
    <DashboardLayout userRole={userRole}>
      <Dashboard userRole={userRole} />
    </DashboardLayout>
  );
};

export default Index;
