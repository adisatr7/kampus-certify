import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Dashboard from "./Dashboard";
import PublicVerify from "./PublicVerify";

const Index = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Gunakan useEffect untuk memeriksa status sesi saat komponen dimuat
  useEffect(() => {
    // Fungsi untuk mendapatkan sesi saat ini
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    checkSession();

    // Dengarkan perubahan state autentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // Cleanup listener saat komponen di-unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Tambahkan efek lain untuk mendapatkan role pengguna dari tabel public.users
  useEffect(() => {
    const fetchUserRole = async (userId) => {
      if (!userId) {
        setUserRole(null);
        return;
      }

      // Ambil role dari tabel public.users yang sudah Anda buat
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } else if (data) {
        setUserRole(data.role);
      }
    };

    if (session) {
      fetchUserRole(session.user.id);
    }
  }, [session]);

  // Tampilkan loading screen saat memeriksa sesi
  if (loading) {
    return <div>Loading...</div>;
  }

  // Menangani tampilan berdasarkan URL (misalnya: untuk verifikasi)
  if (window.location.pathname === "/verify") {
    return <PublicVerify />;
  }

  // Jika tidak ada sesi, tampilkan halaman login
  if (!session) {
    return <LoginPage />;
  }

  // Jika ada sesi tapi role belum terambil, tampilkan loading atau pesan
  if (!userRole) {
    return <div>Getting user role...</div>;
  }

  // Jika semua sudah siap, tampilkan dashboard
  return (
    <DashboardLayout userRole={userRole}>
      <Dashboard userRole={userRole} />
    </DashboardLayout>
  );
};

export default Index;
