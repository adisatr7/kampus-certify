import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import logoUmc from "@/assets/logo-umc.png";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-gradient-to-r from-background via-primary/5 to-background backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-lg sm:rounded-xl blur-lg sm:blur-xl opacity-50 group-hover:opacity-70 transition-all duration-500"></div>
              <div className="relative w-10 h-10 sm:w-16 sm:h-16 bg-white dark:bg-white/95 rounded-lg sm:rounded-xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border border-primary/20 p-1 sm:p-2">
                <img 
                  src={logoUmc} 
                  alt="Logo UMC" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="space-y-0 sm:space-y-1">
              <h1 className="text-sm sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/60 transition-all duration-500">
                <span className="hidden sm:inline">Certificate Authority System</span>
                <span className="sm:hidden">CA UMC</span>
              </h1>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-semibold tracking-wide flex items-center gap-1 sm:gap-2">
                <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-primary animate-pulse"></span>
                <span className="hidden sm:inline">Universitas Muhammadiyah Cirebon</span>
                <span className="sm:hidden">UMC</span>
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg sm:rounded-xl hover:bg-primary/10 transition-all duration-300 hover:scale-110 hover:rotate-12 border border-transparent hover:border-primary/20 h-8 w-8 sm:h-10 sm:w-10"
          >
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-primary" />
            <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-primary" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
