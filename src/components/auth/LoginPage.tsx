import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import campusBackground from "@/assets/campus-bg.jpg";
import { LogIn, Shield, University } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${campusBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-umc-maroon/60 via-umc-dark/40 to-transparent" />
      
      {/* Login Card */}
      <Card className="glass-card w-full max-w-md relative z-10 fade-in-up">
        <CardContent className="p-8 text-center space-y-6">
          {/* Logo & Branding */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <Shield className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-primary">CA UMC</h1>
              <p className="text-sm text-muted-foreground">
                Certificate Authority
              </p>
              <p className="text-xs text-muted-foreground">
                Universitas Muhammadiyah Cirebon
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <University className="h-4 w-4" />
              <span>Sistem Sertifikat Digital Internal</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Penerbitan dan verifikasi sertifikat digital untuk dokumen resmi kampus
            </p>
          </div>

          {/* Login Button */}
          <div className="space-y-4">
            <Button 
              onClick={signInWithGoogle}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Masuk dengan Google
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Hanya akun yang terdaftar dalam sistem yang dapat mengakses
            </p>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              © 2025 UMC - Certificate Authority
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}