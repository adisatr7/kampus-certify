import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: 'admin' | 'dosen' | 'rektor' | 'dekan';
}

export function DashboardLayout({ children, userRole = 'dosen' }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      
      <div className="flex flex-1">
        <AppSidebar 
          userRole={userRole}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        
        <main className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-0"
        )}>
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}