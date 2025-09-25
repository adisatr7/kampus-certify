import { useState } from "react";
import { 
  Shield, 
  FileText, 
  Award, 
  Users, 
  Activity, 
  Search,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Home
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

interface AppSidebarProps {
  userRole: 'admin' | 'dosen' | 'rektor' | 'dekan';
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppSidebar({ userRole, collapsed, onCollapsedChange }: AppSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut } = useAuth();

  // Menu items berdasarkan role - URLs disesuaikan dengan routes di App.tsx
  const menuItems = {
    admin: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Kelola Sertifikat", url: "/admin/certificates", icon: Award },
      { title: "Kelola Dokumen", url: "/admin/documents", icon: FileText },
      { title: "Audit Trail", url: "/admin/audit", icon: Activity },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ],
    dosen: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Dokumen Saya", url: "/documents", icon: FileText },
      { title: "Tanda Tangan", url: "/sign", icon: Award },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ],
    rektor: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Dokumen Saya", url: "/documents", icon: FileText },
      { title: "Tanda Tangan", url: "/sign", icon: Award },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ],
    dekan: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Dokumen Saya", url: "/documents", icon: FileText },
      { title: "Tanda Tangan", url: "/sign", icon: Award },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ]
  };

  const isActive = (path: string) => currentPath === path;
  
  const getNavClass = (path: string) => 
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
      isActive(path) 
        ? "bg-primary text-primary-foreground" 
        : "text-muted-foreground hover:text-accent-foreground"
    );

  const items = menuItems[userRole] || menuItems.dosen;

  return (
    <div className={cn(
      "relative flex h-screen flex-col bg-umc-light-gray border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-primary">CA UMC</h2>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-2 p-4">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={getNavClass(item.url)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
        
        <Separator className="my-4" />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-3">Keluar</span>}
        </Button>
      </div>
    </div>
  );
}