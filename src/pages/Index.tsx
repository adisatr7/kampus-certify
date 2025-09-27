import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Dashboard from "./Dashboard";
import PublicVerify from "./PublicVerify";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to get session');
        } else {
          setSession(session);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        // Clear user role when session changes
        if (!session) {
          setUserRole(null);
        }
      }
    );

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
        
        // First, check if user exists in the users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role, name, email")
          .eq("id", session.user.id)
          .single();

        if (userError) {
          if (userError.code === 'PGRST116') {
            // User doesn't exist in users table, create them
            const { data: newUser, error: insertError } = await supabase
              .from("users")
              .insert([
                {
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.full_name || session.user.email,
                  role: 'dosen', // Default role
                  google_id: session.user.user_metadata?.sub
                }
              ])
              .select("role")
              .single();

            if (insertError) {
              console.error("Error creating user:", insertError);
              setError("Failed to create user profile");
              return;
            }

            setUserRole(newUser.role);
            
            // Create audit trail entry for new user
            await supabase.rpc('create_audit_entry', {
              p_user_id: session.user.id,
              p_action: 'user_registered',
              p_description: `New user registered: ${session.user.email}`
            });
            
          } else {
            console.error("Error fetching user role:", userError);
            setError("Failed to fetch user profile");
            return;
          }
        } else {
          setUserRole(userData.role);
          
          // Update last login in audit trail
          await supabase.rpc('create_audit_entry', {
            p_user_id: session.user.id,
            p_action: 'user_login',
            p_description: `User logged in: ${userData.name}`
          });
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
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
        <Alert variant="destructive" className="max-w-md">
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
          <Alert variant="destructive" className="max-w-md">
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