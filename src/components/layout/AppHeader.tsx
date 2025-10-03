import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-background/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">UMC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Certificate Authority</h1>
              <p className="text-xs text-muted-foreground">Universitas Muhammadiyah Cirebon</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
