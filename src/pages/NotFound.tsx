import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Shield } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-umc-light-gray via-background to-umc-light-gray p-4">
      <Card className="glass-card w-full max-w-md text-center">
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-center">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <h2 className="text-xl font-semibold">Halaman Tidak Ditemukan</h2>
            <p className="text-muted-foreground">
              Maaf, halaman yang Anda cari tidak dapat ditemukan dalam sistem CA UMC.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <a href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Kembali ke Beranda
              </a>
            </Button>
            
            <Button variant="outline" asChild>
              <a href="/verify" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Portal Verifikasi
              </a>
            </Button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              © 2025 UMC - Certificate Authority
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;