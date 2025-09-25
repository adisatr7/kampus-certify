import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Activity, User, FileText, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  };
}

export default function AuditTrail() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchAuditEntries();
  }, []);

  const fetchAuditEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_trail')
        .select(`
          *,
          users (
            name,
            email,
            role
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditEntries(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat audit trail",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
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
      'CREATE_CERTIFICATE': 'Buat Sertifikat',
      'REVOKE_CERTIFICATE': 'Cabut Sertifikat',
      'CREATE_DOCUMENT': 'Buat Dokumen',
      'SIGN_DOCUMENT': 'Tanda Tangan',
      'DELETE_DOCUMENT': 'Hapus Dokumen',
      'VERIFY_DOCUMENT': 'Verifikasi'
    };

    const getVariant = (action: string) => {
      if (action.includes('CREATE')) return 'default';
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
    
    const matchesAction = filterAction === "" || entry.action === filterAction;
    
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(auditEntries.map(entry => entry.action))];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userProfile?.role as any}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Trail</h1>
          <p className="text-muted-foreground">Riwayat semua aktivitas dalam sistem CA UMC</p>
        </div>

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
                    <SelectItem value="">Semua Aksi</SelectItem>
                    {uniqueActions.map((action) => (
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
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterAction ? 'Tidak ada hasil yang ditemukan' : 'Belum ada aktivitas'}
                </p>
              </div>
            ) : (
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
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(entry.action)}
                          {getActionBadge(entry.action)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{entry.description}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}