import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: 'admin' | 'dosen' | 'rektor' | 'dekan';
}

export function DashboardLayout({ children, userRole = 'dosen' }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />

      <div className="flex flex-1 relative">
        {/* Mobile Overlay */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        <AppSidebar
          userRole={userRole}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main className={cn(
          "flex-1 transition-all duration-300 w-full",
          "lg:ml-16",
          !sidebarCollapsed && "lg:ml-64"
        )}>
          <div className="container mx-auto p-3 sm:p-6">
            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="lg:hidden mb-4"
            >
              <Menu className="h-4 w-4 mr-2" />
              Menu
            </Button>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}