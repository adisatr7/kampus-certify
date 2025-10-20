import {
  Activity,
  AlertTriangle,
  Calendar,
  FileText,
  RefreshCw,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  created_at: string;
  user_id: string;
  users?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface DiagnosticInfo {
  totalAuditEntries: number;
  totalUsers: number;
  currentUserRole: string;
  hasRLSAccess: boolean;
  sampleEntry?: any;
}

export default function AuditTrail() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile) {
      runDiagnostics();
      fetchAuditEntries();
    }
  }, [userProfile]);

  const runDiagnostics = async () => {
    try {
      const { count: auditCount } = await supabase
        .from("audit_trail")
        .select("*", { count: "exact", head: true });
      const { count: userCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });
      const { data: sampleData } = await supabase.from("audit_trail").select("*").limit(1);
      const { error: rlsError } = await supabase.from("audit_trail").select("id").limit(1);

      setDiagnostic({
        totalAuditEntries: auditCount || 0,
        totalUsers: userCount || 0,
        currentUserRole: userProfile?.role || "unknown",
        hasRLSAccess: !rlsError,
        sampleEntry: sampleData?.[0] || null,
      });
    } catch (error) {
      console.error("Diagnostic error:", error);
    }
  };

  const createTestAuditEntry = async () => {
    try {
      const { error } = await supabase.rpc("create_audit_entry", {
        p_user_id: userProfile.id,
        p_action: "TEST_LOGIN",
        p_description: `Test entry ${new Date().toISOString()}`,
      });

      if (error) {
        await supabase.from("audit_trail").insert({
          user_id: userProfile.id,
          action: "TEST_LOGIN",
          description: `Test entry ${new Date().toISOString()}`,
        });
      }

      toast({
        title: "Test Entry Created",
        description: "Test audit entry created successfully",
      });

      runDiagnostics();
      fetchAuditEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchAuditEntries = async () => {
    try {
      setLoading(true);
      const { data: auditData, error: auditError } = await supabase
        .from("audit_trail")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (auditError) {
        throw auditError;
      }

      const userIds = [...new Set(auditData.map((e) => e.user_id).filter(Boolean))];
      const { data: userData } = await supabase
        .from("users")
        .select("id, name, email, role")
        .in("id", userIds);

      const userMap = new Map(userData?.map((u) => [u.id, u]) || []);
      const combinedData = auditData.map((e) => ({
        ...e,
        users: userMap.get(e.user_id) || null,
      }));

      setAuditEntries(combinedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Gagal memuat audit trail: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "LOGIN":
      case "TEST_LOGIN":
        return <User className="h-5 w-5 text-blue-500" />;
      case "CREATE_DOCUMENT":
      case "SIGN_DOCUMENT":
      case "DELETE_DOCUMENT":
        return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    const actionLabels: Record<string, string> = {
      LOGIN: "Login",
      TEST_LOGIN: "Test Login",
      CREATE_DOCUMENT: "Buat Dokumen",
      SIGN_DOCUMENT: "Tanda Tangan",
      DELETE_DOCUMENT: "Hapus Dokumen",
    };
    return (
      <Badge className="text-xs bg-green-500 text-white px-2 py-0.5">
        {actionLabels[action] || action}
      </Badge>
    );
  };

  const filteredEntries = auditEntries.filter((entry) => {
    const matchesSearch =
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction =
      filterAction === "" || filterAction === "all" || entry.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(auditEntries.map((e) => e.action))];

  return (
    <DashboardLayout userRole={userProfile?.role as any}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit Trail</h1>
            <p className="text-muted-foreground">Riwayat aktivitas sistem CA UMC</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Diagnostics
            </Button>
            <Button
              variant="outline"
              onClick={createTestAuditEntry}
            >
              <Activity className="mr-2 h-4 w-4" />
              Test Entry
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                runDiagnostics();
                fetchAuditEntries();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Diagnostics */}
        {showDiagnostics && diagnostic && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">System Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium">Audit Entries</p>
                  <p className="text-2xl font-bold">{diagnostic.totalAuditEntries}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Users</p>
                  <p className="text-2xl font-bold">{diagnostic.totalUsers}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Your Role</p>
                  <p className="text-lg font-bold">{diagnostic.currentUserRole}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">RLS Access</p>
                  <p
                    className={`text-lg font-bold ${
                      diagnostic.hasRLSAccess ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {diagnostic.hasRLSAccess ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan deskripsi atau user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={filterAction}
                  onValueChange={setFilterAction}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter aksi..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Aksi</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem
                        key={action}
                        value={action}
                      >
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabel (desktop) */}
        <Card className="overflow-hidden hidden md:block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Riwayat Aktivitas ({filteredEntries.length} dari {auditEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Tidak ada hasil yang ditemukan untuk filter saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Deskripsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              <div>{new Date(entry.created_at).toLocaleDateString("id-ID")}</div>
                              <div className="text-muted-foreground text-xs">
                                {new Date(entry.created_at).toLocaleTimeString("id-ID")}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.users ? (
                            <div>
                              <div className="font-medium">{entry.users.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.users.email}
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs mt-1"
                              >
                                {entry.users.role}
                              </Badge>
                            </div>
                          ) : (
                            <div>
                              <span className="text-muted-foreground">System User</span>
                              <div className="text-xs text-muted-foreground font-mono">
                                {entry.user_id?.substring(0, 8)}...
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(entry.action)}
                            {getActionBadge(entry.action)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{entry.description || "Tidak ada deskripsi"}</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card view (mobile) */}
        <Card className="md:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Activity className="h-5 w-5 text-blue-500" />
              Riwayat Aktivitas ({filteredEntries.length} dari {auditEntries.length})
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">
                Tidak ada aktivitas ditemukan.
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-sm"
                >
                  <div className="flex-shrink-0 bg-green-50 p-2 rounded-full">
                    {getActionIcon(entry.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-800">
                        {entry.users?.name.toLowerCase()}
                      </p>
                      <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                        {entry.users?.email}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">
                      {entry.description || "Tidak ada deskripsi"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Action <span className="font-medium text-slate-700">{entry.action}</span>
                    </p>
                    <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{" "}
                      {new Date(entry.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {new Date(entry.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
