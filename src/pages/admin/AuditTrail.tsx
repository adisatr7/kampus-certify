import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Calendar, Search, Activity, User, FileText, Shield, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/useToast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
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
  console.log("🚀 AuditTrail component is rendering!");
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true); // Show by default for debugging
  const [debugInfo, setDebugInfo] = useState<string>(""); // Add debug info state
  const { toast } = useToast();
  const { userProfile, user } = useAuth();

  // Fungsi debug untuk melacak perubahan state
  useEffect(() => {
    console.log("🔄 State AuditEntries berubah:", {
      jumlah: auditEntries.length,
      entries: auditEntries.slice(0, 2), // Hanya tampilkan 2 entry pertama untuk debug
      loading,
      roleUser: userProfile?.role
    });
    setDebugInfo(`Entries: ${auditEntries.length}, Loading: ${loading}, Role: ${userProfile?.role}`);
  }, [auditEntries.length, loading, userProfile?.role]); // Dependencies yang lebih spesifik

  useEffect(() => {
    if (userProfile) {
      runDiagnostics();
      fetchAuditEntries();
    }
  }, [userProfile]);

  const runDiagnostics = async () => {
    try {
      console.log("🔍 Running diagnostics...");

      // Check total audit entries without joins
      const { count: auditCount, error: auditCountError } = await supabase
        .from('audit_trail')
        .select('*', { count: 'exact', head: true });

      // Check total users
      const { count: userCount, error: userCountError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Try to get a sample audit entry
      const { data: sampleData, error: sampleError } = await supabase
        .from('audit_trail')
        .select('*')
        .limit(1);

      // Test RLS access
      const { data: rlsTest, error: rlsError } = await supabase
        .from('audit_trail')
        .select('id')
        .limit(1);

      const diagnosticInfo: DiagnosticInfo = {
        totalAuditEntries: auditCount || 0,
        totalUsers: userCount || 0,
        currentUserRole: userProfile?.role || 'unknown',
        hasRLSAccess: !rlsError,
        sampleEntry: sampleData?.[0] || null
      };

      setDiagnostic(diagnosticInfo);

      console.log("🔍 Diagnostic results:", {
        auditCount,
        auditCountError,
        userCount,
        userCountError,
        sampleData,
        sampleError,
        rlsTest,
        rlsError,
        currentUser: userProfile
      });

    } catch (error) {
      console.error("🔍 Diagnostic error:", error);
    }
  };

  const createTestAuditEntry = async () => {
    try {
      console.log("🧪 Creating test audit entry...");

      // Use the public function if available, or direct insert
      const { data, error } = await supabase.rpc('create_audit_entry', {
        p_user_id: userProfile.id,
        p_action: 'TEST_LOGIN',
        p_description: `Test audit entry created at ${new Date().toISOString()}`
      });

      if (error) {
        console.log("🧪 Function call failed, trying direct insert...");
        // Fallback to direct insert
        const { data: insertData, error: insertError } = await supabase
          .from('audit_trail')
          .insert({
            user_id: userProfile.id,
            action: 'TEST_LOGIN',
            description: `Test audit entry created at ${new Date().toISOString()}`
          })
          .select();

        if (insertError) throw insertError;

        console.log("🧪 Direct insert successful:", insertData);
      } else {
        console.log("🧪 Function call successful:", data);
      }

      toast({
        title: "Test Entry Created",
        description: "Test audit entry has been created successfully",
      });

      // Refresh data
      await runDiagnostics();
      await fetchAuditEntries();

    } catch (error) {
      console.error("🧪 Error creating test entry:", error);
      toast({
        title: "Error",
        description: `Failed to create test entry: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchAuditEntries = async () => {
    console.log("📊 Memuat data audit entries...");

    try {
      setLoading(true);

      // Karena diagnostik menunjukkan data ada, gunakan pendekatan sederhana
      console.log("📊 Menggunakan query langsung tanpa join...");

      // Ambil data audit tanpa join terlebih dahulu
      const { data: auditData, error: auditError } = await supabase
        .from('audit_trail')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      console.log("📊 Data audit mentah:", auditData);
      console.log("📊 Error audit mentah:", auditError);

      if (auditError) throw auditError;

      if (!auditData || auditData.length === 0) {
        console.log("📊 Tidak ada data audit ditemukan");
        setAuditEntries([]);
        return;
      }

      // Ambil semua user ID yang unik
      const userIds = [...new Set(auditData.map(entry => entry.user_id).filter(Boolean))];
      console.log("📊 User ID yang akan dicari:", userIds);

      // Ambil data user secara terpisah
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', userIds);

      console.log("📊 Data user:", userData);
      console.log("📊 Error user:", userError);

      // Buat peta pencarian user
      const userMap = new Map();
      if (userData && !userError) {
        userData.forEach(user => userMap.set(user.id, user));
      }

      // Gabungkan data audit dengan data user
      const combinedData = auditData.map(entry => ({
        ...entry,
        users: userMap.get(entry.user_id) || null
      }));

      console.log("📊 Data gabungan:", combinedData);
      console.log("📊 Menyetel audit entries dengan", combinedData.length, "item");

      // Update state langsung tanpa setTimeout
      setAuditEntries(combinedData);
      console.log("📊 State diperbarui, panjang auditEntries saat ini:", combinedData.length);

    } catch (error) {
      console.error("📊 Error mengambil audit entries:", error);
      toast({
        title: "Error",
        description: `Gagal memuat audit trail: ${error.message}`,
        variant: "destructive",
      });
      setAuditEntries([]); // Set array kosong saat error
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'TEST_LOGIN':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'CREATE_CERTIFICATE':
      case 'REVOKE_CERTIFICATE':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'CREATE_DOCUMENT':
      case 'SIGN_DOCUMENT':
      case 'DELETE_DOCUMENT':
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    const actionLabels: Record<string, string> = {
      'LOGIN': 'Login',
      'TEST_LOGIN': 'Test Login',
      'CREATE_CERTIFICATE': 'Buat Sertifikat',
      'REVOKE_CERTIFICATE': 'Cabut Sertifikat',
      'CREATE_DOCUMENT': 'Buat Dokumen',
      'SIGN_DOCUMENT': 'Tanda Tangan',
      'DELETE_DOCUMENT': 'Hapus Dokumen',
      'VERIFY_DOCUMENT': 'Verifikasi'
    };

    const getVariant = (action: string) => {
      if (action.includes('CREATE') || action.includes('LOGIN')) return 'default';
      if (action.includes('DELETE') || action.includes('REVOKE')) return 'destructive';
      if (action.includes('SIGN') || action.includes('VERIFY')) return 'secondary';
      return 'outline';
    };

    return (
      <Badge variant={getVariant(action) as any}>
        {actionLabels[action] || action}
      </Badge>
    );
  };

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch =
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === "" || filterAction === "all" || entry.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(auditEntries.map(entry => entry.action))];

  // Check if user is admin
  if (!loading && userProfile?.role !== 'admin') {
    return (
      <DashboardLayout userRole={userProfile?.role as any}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
            <p className="text-muted-foreground">
              Hanya admin yang dapat mengakses audit trail
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout userRole={userProfile?.role as any}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userProfile?.role as any}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit Trail</h1>
            <p className="text-muted-foreground">Riwayat semua aktivitas dalam sistem CA UMC</p>
          </div>

          <div className="flex gap-2">
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

        {/* Diagnostics Panel */}
        {showDiagnostics && diagnostic && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">System Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                  <p className={`text-lg font-bold ${diagnostic.hasRLSAccess ? 'text-green-600' : 'text-red-600'}`}>
                    {diagnostic.hasRLSAccess ? 'Yes' : 'No'}
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
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan deskripsi atau user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter aksi..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Aksi</SelectItem>
                    {uniqueActions.filter(action => action && action.trim() !== '').map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Riwayat Aktivitas ({filteredEntries.length} dari {auditEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              console.log("🎨 Keputusan render - panjang auditEntries:", auditEntries.length);
              console.log("🎨 Keputusan render - panjang filteredEntries:", filteredEntries.length);
              console.log("🎨 Keputusan render - loading:", loading);
              console.log("🎨 Keputusan render - filterAction:", filterAction);
              console.log("🎨 Keputusan render - searchTerm:", searchTerm);

              // Debug: Cek apakah filteredEntries ada isinya
              if (auditEntries.length > 0) {
                console.log("🎨 Sample auditEntries[0]:", auditEntries[0]);
                console.log("🎨 Sample filteredEntries[0]:", filteredEntries[0]);
              }

              if (loading) {
                return (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Memuat data...</p>
                  </div>
                );
              }

              if (auditEntries.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Belum ada aktivitas yang tercatat
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Audit trail akan muncul ketika ada aktivitas dalam sistem
                    </p>
                    <Button onClick={createTestAuditEntry} variant="outline">
                      <Activity className="mr-2 h-4 w-4" />
                      Buat Entry Test
                    </Button>
                  </div>
                );
              }

              if (filteredEntries.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Tidak ada hasil yang ditemukan untuk filter yang diterapkan
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Filter saat ini:</p>
                      <p>- Pencarian: "{searchTerm || 'kosong'}"</p>
                      <p>- Aksi: "{filterAction || 'semua'}"</p>
                      <p>- Total data: {auditEntries.length}</p>
                    </div>
                  </div>
                );
              }

              // Jika sampai sini, berarti ada data yang harus ditampilkan
              return (
                <div className="overflow-x-auto">
                  <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
                    Debug: Menampilkan {filteredEntries.length} dari {auditEntries.length} entries
                  </div>
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
                      {filteredEntries.map((entry, index) => {
                        console.log(`🎨 Merender entry ${index}:`, entry);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div className="text-sm">
                                  <div>{new Date(entry.timestamp).toLocaleDateString('id-ID')}</div>
                                  <div className="text-muted-foreground">
                                    {new Date(entry.timestamp).toLocaleTimeString('id-ID')}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {entry.users ? (
                                <div>
                                  <div className="font-medium">{entry.users.name}</div>
                                  <div className="text-sm text-muted-foreground">{entry.users.email}</div>
                                  <Badge variant="outline" className="text-xs mt-1">
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
                              <p className="text-sm">{entry.description || 'Tidak ada deskripsi'}</p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}