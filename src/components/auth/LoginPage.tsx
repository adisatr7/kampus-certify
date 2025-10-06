import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import campusBackground from "@/assets/campus.jpg";
import { Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="flex-1 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden"
        style={{
          backgroundImage: `url(${campusBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/90 via-gray-900/85 to-red-900/80 dark:from-red-950/95 dark:via-gray-950/90 dark:to-red-900/85" />
      
      {/* Blur elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
      
        {/* Login Card */}
        <Card className="w-full max-w-lg relative z-10 border-0 shadow-2xl backdrop-blur-2xl bg-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
        
          <CardContent className="p-6 sm:p-10 lg:p-12">
            {/* Logo */}
            <div className="flex justify-center mb-6 sm:mb-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl sm:rounded-3xl blur-xl sm:blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-background to-muted p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-border group-hover:scale-105 transition-transform duration-300">
                  <img 
                    src="https://muslimahnews.id/wp-content/uploads/2022/07/logo-umc-1009x1024-Reza-M-768x779-1.png"
                    alt="Logo UMC"
                    className="h-14 w-14 sm:h-20 sm:w-20 object-contain"
                  />
                </div>
              </div>
            </div>
          
            {/* Title */}
            <div className="text-center mb-6 sm:mb-10">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-red-50 dark:bg-red-950/30 rounded-full mb-3 sm:mb-4">
                <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-700 dark:text-red-400" />
                <span className="text-[10px] sm:text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Certificate Authority</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-br from-foreground via-red-900 to-red-800 dark:from-foreground dark:via-red-400 dark:to-red-500 bg-clip-text text-transparent mb-2 sm:mb-3">
                CA UMC
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Universitas Muhammadiyah Cirebon</p>
            </div>

          {/* Login Button */}
          <Button 
            onClick={signInWithGoogle}
            className="w-full bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white h-11 sm:h-14 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl group"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Masuk dengan Google
          </Button>
          
            {/* Notice */}
            <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-4 sm:mt-6">
              Akses terbatas untuk akun terdaftar
            </p>

            {/* Footer */}
            <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-border">
              <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                © 2025 UMC Certificate Authority
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}