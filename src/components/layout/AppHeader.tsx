import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import logoUmc from "@/assets/logo-umc.png";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-gradient-to-r from-background via-primary/5 to-background backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-all duration-500"></div>
              <div className="relative w-16 h-16 bg-white dark:bg-white/95 rounded-xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border border-primary/20 p-2">
                <img 
                  src={logoUmc} 
                  alt="Logo UMC" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/60 transition-all duration-500">
                Certificate Authority System
              </h1>
              <p className="text-sm text-muted-foreground font-semibold tracking-wide flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                Universitas Muhammadiyah Cirebon
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl hover:bg-primary/10 transition-all duration-300 hover:scale-110 hover:rotate-12 border border-transparent hover:border-primary/20"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-primary" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-primary" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
