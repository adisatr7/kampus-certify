import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Keep loading true while we verify the user
          setLoading(true);
          
          // Verify user exists in database
          (async () => {
            console.log("Auth: Fetching user profile for:", session.user.id, session.user.email);
            try {
              const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              if (error) {
                console.error('Auth: Error fetching user profile:', error);
                toast({
                  title: "Akses Ditolak",
                  description: "Terjadi kesalahan saat memeriksa akun Anda. Silakan coba lagi.",
                  variant: "destructive",
                });
                await supabase.auth.signOut();
                setUserProfile(null);
              } else if (!profile) {
                // User not registered in our system
                console.log("Auth: User not found in database");
                toast({
                  title: "Akses Ditolak",
                  description: "Email Anda tidak terdaftar dalam sistem CA UMC. Silakan hubungi administrator untuk mendaftarkan akun Anda.",
                  variant: "destructive",
                });
                await supabase.auth.signOut();
                setUserProfile(null);
              } else {
                console.log("Auth: Successfully fetched profile:", profile);
                setUserProfile(profile);
              }
            } catch (err) {
              console.error('Auth: Profile fetch error:', err);
              await supabase.auth.signOut();
              setUserProfile(null);
            } finally {
              setLoading(false);
            }
          })();
        } else {
          console.log("Auth: No session user, setting profile to null");
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session - this will trigger the onAuthStateChange handler
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
      // If there is a session, the onAuthStateChange handler will verify and set loading
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast({
          title: "Error Login",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat login",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
      toast({
        title: "Berhasil Logout",
        description: "Anda telah keluar dari sistem",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat logout",
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}