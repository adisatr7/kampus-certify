import {
  Activity,
  Award,
  ChevronDown,
  ChevronLeft,
  FileText,
  GraduationCap,
  Home,
  Layout,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userRole: "admin" | "dosen" | "rektor" | "dekan";
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppSidebar({ userRole, collapsed, onCollapsedChange }: AppSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut } = useAuth();
  const [isDocumentMenuOpen, setIsDocumentMenuOpen] = useState(true);

  // Submenu Kelola Dokumen
  const documentSubmenu = {
    admin: [
      { title: "Unggah Dokumen", url: "/admin/documents", icon: Upload },
      { title: "Daftar Dokumen", url: "/admin/documents", icon: FileText },
      { title: "Buat Ijazah", url: "/admin/create-ijazah", icon: GraduationCap },
      { title: "Buat Sertifikat", url: "/admin/create-sertifikat", icon: Award },
      { title: "Kelola Template", url: "/admin/templates", icon: Layout },
    ],
    rektor: [
      { title: "Unggah Dokumen", url: "/documents", icon: Upload },
      { title: "Daftar Dokumen", url: "/documents", icon: FileText },
      { title: "Buat Ijazah", url: "/create-ijazah", icon: GraduationCap },
      { title: "Buat Sertifikat", url: "/create-sertifikat", icon: Award },
    ],
    dosen: [
      { title: "Unggah Dokumen", url: "/documents", icon: Upload },
      { title: "Daftar Dokumen", url: "/documents", icon: FileText },
      { title: "Buat Sertifikat", url: "/create-sertifikat", icon: Award },
    ],
    dekan: [
      { title: "Unggah Dokumen", url: "/documents", icon: Upload },
      { title: "Daftar Dokumen", url: "/documents", icon: FileText },
      { title: "Buat Ijazah", url: "/create-ijazah", icon: GraduationCap },
      { title: "Buat Sertifikat", url: "/create-sertifikat", icon: Award },
    ],
  };

  // Menu items berdasarkan role
  const menuItems = {
    admin: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Kelola Sertifikat", url: "/admin/certificates", icon: ShieldCheck },
      { title: "Tanda Tangan", url: "/admin/sign", icon: Award },
      { title: "Audit Trail", url: "/admin/audit", icon: Activity },
      { title: "Kelola Pengguna", url: "/admin/users", icon: Users },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ],
    dosen: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Tanda Tangan", url: "/sign", icon: Award },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ],
    rektor: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Tanda Tangan", url: "/sign", icon: Award },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ],
    dekan: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Tanda Tangan", url: "/sign", icon: Award },
      { title: "Verifikasi Publik", url: "/verify", icon: Search },
    ],
  };

  const isActive = (path: string) => currentPath === path;

  const getNavClass = (path: string) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
      isActive(path)
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-accent-foreground",
    );

  const items = menuItems[userRole] || menuItems.dosen;
  const docItems = documentSubmenu[userRole] || documentSubmenu.dosen;

  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    // Redirect to home
    navigate("/");
  };

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col bg-umc-light-gray dark:bg-neutral-900 border-r border-border transition-all duration-300 pt-28",
        "fixed inset-y-0 left-0 z-40 overflow-hidden",
        collapsed ? "w-14 -translate-x-full lg:translate-x-0 justify-center items-center" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {/* Logo */}
            <img
              src="https://muslimahnews.id/wp-content/uploads/2022/07/logo-umc-1009x1024-Reza-M-768x779-1.png"
              alt="Logo UMC"
              className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
            />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-primary dark:text-red-600">
                CA UMC
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground dark:text-gray-300 capitalize">
                {userRole}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center w-full">
            <img
              src="https://muslimahnews.id/wp-content/uploads/2022/07/logo-umc-1009x1024-Reza-M-768x779-1.png"
              alt="Logo UMC"
              className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
            />
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange(!collapsed)}
          className="h-8 w-8 sm:h-12 sm:w-12 p-0"
        >
          {collapsed ? (
            <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-2 p-2 sm:p-4">
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

        {/* Kelola Dokumen Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => setIsDocumentMenuOpen(!isDocumentMenuOpen)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              "text-muted-foreground hover:text-accent-foreground"
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span>Kelola Dokumen</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    isDocumentMenuOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>

          {/* Submenu Items */}
          {!collapsed && isDocumentMenuOpen && (
            <div className="ml-6 space-y-1 border-l-2 border-border pl-2">
              {docItems.map((subItem) => (
                <NavLink
                  key={subItem.title}
                  to={subItem.url}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    isActive(subItem.url)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-accent-foreground"
                  )}
                >
                  <subItem.icon className="h-4 w-4 shrink-0" />
                  <span>{subItem.title}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-4" />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </Button>
      </div>
    </div>
  );
}
