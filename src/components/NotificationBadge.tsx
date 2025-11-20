import { Bell } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/DropdownMenu";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useNavigate } from "react-router-dom";

export function NotificationBadge() {
  const { pendingCount, pendingDocuments } = useRealtimeNotifications();
  const navigate = useNavigate();

  const handleViewDocument = () => {
    navigate("/sign");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <h3 className="font-semibold text-sm mb-2">Dokumen Menunggu Tanda Tangan</h3>
          {pendingDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Tidak ada dokumen yang perlu ditandatangani
            </p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {pendingDocuments.map((doc) => (
                <DropdownMenuItem
                  key={doc.id}
                  onClick={handleViewDocument}
                  className="cursor-pointer flex flex-col items-start p-2"
                >
                  <span className="font-medium text-sm">{doc.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
