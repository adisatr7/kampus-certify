import { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { User as UserProfile } from "../types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Keep loading true while we verify the user
        setLoading(true);

        // Verify user exists in database
        (async () => {
          console.log(
            "Auth: Fetching user profile for email:",
            session.user.email
          );
          try {
            // Find user by email only
            let { data: profile, error } = await supabase
              .from("users")
              .select("*")
              .eq("email", session.user.email)
              .maybeSingle();

            console.log("Auth: Email lookup result:", {
              profile,
              error,
            });

            if (error) {
              console.error("Auth: Error fetching user by email:", error);
            } else if (profile) {
              // Found user by email - sync ID if different
              if (profile.id !== session.user.id) {
                console.log(
                  "Auth: Syncing user ID from",
                  profile.id,
                  "to",
                  session.user.id
                );

                const { data: updatedProfile, error: updateError } = await (
                  supabase.rpc as any
                )("sync_user_id_by_email", {
                  p_email: session.user.email,
                  p_new_id: session.user.id,
                });

                if (updateError) {
                  console.error("Auth: Error updating user ID:", updateError);
                  error = updateError;
                } else if (
                  updatedProfile &&
                  Array.isArray(updatedProfile) &&
                  updatedProfile.length > 0
                ) {
                  profile = updatedProfile[0];
                  console.log("Auth: Successfully synced user ID");
                } else {
                  console.error("Auth: No profile returned from sync");
                  error = { message: "Failed to sync user ID" } as any;
                }
              }
            } else {
              console.log(
                "Auth: No user found with email:",
                session.user.email
              );
            }

            if (error) {
              console.error("Auth: Error fetching user profile:", error);
              toast({
                title: "Akses Ditolak",
                description:
                  "Terjadi kesalahan saat memeriksa akun Anda. Silakan coba lagi.",
                variant: "destructive",
              });
              await supabase.auth.signOut();
              setUserProfile(null);
            } else if (!profile) {
              // User not registered in our system
              console.log("Auth: User not found in database");
              toast({
                title: "Akses Ditolak",
                description:
                  "Email Anda tidak terdaftar dalam sistem CA UMC. Silakan hubungi administrator untuk mendaftarkan akun Anda.",
                variant: "destructive",
              });
              await supabase.auth.signOut();
              setUserProfile(null);
            } else {
              console.log("Auth: Successfully fetched profile:", profile);
              setUserProfile(profile);
            }
          } catch (err) {
            console.error("Auth: Profile fetch error:", err);
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
    });

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
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        },
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
