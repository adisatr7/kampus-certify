import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Shield, Calendar, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/audit";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface Certificate {
  id: string;
  user_id: string;
  serial_number: string;
  algorithm: string;
  issued_at: string;
  expires_at: string;
  status: string;
  users: {
    name: string;
    email: string;
    role: string;
  };
}

export default function CertificateManagement() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Form state
  const [userId, setUserId] = useState("");
  const [algorithm, setAlgorithm] = useState("RSA-2048");
  const [expiryDays, setExpiryDays] = useState("365");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchCertificates();
    fetchUsers();
  }, []);

  const fetchCertificates = async () => {
    try {
        const { data, error } = await supabase
            .from('certificates')
            .select(`
                id,
                serial_number,
                algorithm,
                issued_at,
                expires_at,
                status,
                user_id,
                users:user_id (
                    name,
                    email,
                    role
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setCertificates(data || []);
    } catch (error) {
        toast({
            title: "Error",
            description: "Gagal memuat daftar sertifikat",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const generateCertificate = async () => {
    if (!userId || !algorithm || !expiryDays) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedUser = users.find(u => u.id === userId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

      // Generate serial number
      const serialNumber = `UMC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

      // In a real implementation, you would generate actual RSA key pairs
      // For demo purposes, we'll create placeholder keys
      const publicKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----`;
      const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD...\n-----END PRIVATE KEY-----`;

      const { error } = await supabase
        .from('certificates')
        .insert({
          user_id: userId,
          serial_number: serialNumber,
          algorithm,
          public_key: publicKey,
          private_key: privateKey,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        });

      if (error) throw error;

      await createAuditEntry(
        userProfile.id,
        'CREATE_CERTIFICATE',
        `Membuat sertifikat untuk ${selectedUser?.name} (${selectedUser?.email})`
      );

      toast({
        title: "Berhasil",
        description: "Sertifikat berhasil dibuat",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchCertificates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal membuat sertifikat",
        variant: "destructive",
      });
    }
  };

  const revokeCertificate = async (certificateId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('certificates')
        .update({ 
          status: 'revoked',
          revoked_at: new Date().toISOString()
        })
        .eq('id', certificateId);

      if (error) throw error;

      await createAuditEntry(
        userProfile.id,
        'REVOKE_CERTIFICATE',
        `Mencabut sertifikat milik ${userName}`
      );

      toast({
        title: "Berhasil",
        description: "Sertifikat berhasil dicabut",
      });

      fetchCertificates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mencabut sertifikat",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setUserId("");
    setAlgorithm("RSA-2048");
    setExpiryDays("365");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-status-valid" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'revoked':
        return <XCircle className="h-4 w-4 text-status-invalid" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-status-valid text-white">Aktif</Badge>;
      case 'expired':
        return <Badge className="bg-orange-500 text-white">Kadaluarsa</Badge>;
      case 'revoked':
        return <Badge className="bg-status-invalid text-white">Dicabut</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole={userProfile?.role as any}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userProfile?.role as any}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manajemen Sertifikat</h1>
            <p className="text-muted-foreground">Kelola sertifikat digital untuk penandatanganan dokumen</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Buat Sertifikat Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Sertifikat Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user">Pilih User</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="algorithm">Algoritma</Label>
                  <Select value={algorithm} onValueChange={setAlgorithm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RSA-2048">RSA-2048</SelectItem>
                      <SelectItem value="RSA-4096">RSA-4096</SelectItem>
                      <SelectItem value="ECDSA-P256">ECDSA-P256</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="expiry">Masa Berlaku (hari)</Label>
                  <Input
                    id="expiry"
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    placeholder="365"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Batal
                  </Button>
                  <Button onClick={generateCertificate}>
                    Buat Sertifikat
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Daftar Sertifikat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada sertifikat yang dibuat</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Algoritma</TableHead>
                    <TableHead>Diterbitkan</TableHead>
                    <TableHead>Kadaluarsa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cert.users.name}</div>
                          <div className="text-sm text-muted-foreground">{cert.users.email}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {cert.users.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {cert.serial_number}
                      </TableCell>
                      <TableCell>{cert.algorithm}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(cert.issued_at).toLocaleDateString('id-ID')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(cert.expires_at).toLocaleDateString('id-ID')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(cert.status)}
                          {getStatusBadge(cert.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.status === 'active' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => revokeCertificate(cert.id, cert.users.name)}
                          >
                            Cabut
                          </Button>
                        )}
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