import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Plus,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { Certificate } from "../../types";

export default function CertificateManagement() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Form state
  const [userId, setUserId] = useState("");
  const [expiryDays, setExpiryDays] = useState("365");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchCertificates();
    fetchUsers();
  }, []);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select(`
                id,
                serial_number,
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch {
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
        .from("users")
        .select("id, name, email, role")
        .order("name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const generateCertificate = async () => {
    if (!userId || !expiryDays) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedUser = users.find((u) => u.id === userId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

      const serialNumber =
        `UMC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

      const { error } = await supabase.from("certificates").insert({
        user_id: userId,
        serial_number: serialNumber,
        expires_at: expiresAt.toISOString(),
        status: "active",
      });

      if (error) throw error;

      await createAuditEntry(
        userProfile.id,
        "CREATE_CERTIFICATE",
        `Membuat sertifikat untuk ${selectedUser?.name} (${selectedUser?.email})`
      );

      toast({
        title: "Berhasil",
        description: "Sertifikat berhasil dibuat",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchCertificates();
    } catch {
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
        .from("certificates")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("id", certificateId);

      if (error) throw error;

      await createAuditEntry(
        userProfile.id,
        "REVOKE_CERTIFICATE",
        `Mencabut sertifikat milik ${userName}`
      );

      toast({
        title: "Berhasil",
        description: "Sertifikat berhasil dicabut",
      });

      fetchCertificates();
    } catch {
      toast({
        title: "Error",
        description: "Gagal mencabut sertifikat",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setUserId("");
    setExpiryDays("365");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-status-valid" />;
      case "expired":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "revoked":
        return <XCircle className="h-4 w-4 text-status-invalid" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-status-valid text-white">Aktif</Badge>;
      case "expired":
        return <Badge className="bg-orange-500 text-white">Kadaluarsa</Badge>;
      case "revoked":
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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Manajemen Sertifikat
            </h1>
            <p className="text-muted-foreground">
              Kelola sertifikat digital untuk penandatanganan dokumen
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
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
                  <Button onClick={generateCertificate}>Buat Sertifikat</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table / Card Responsive */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
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
                <p className="text-muted-foreground">
                  Belum ada sertifikat yang dibuat
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Serial Number</TableHead>
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
                              <div className="font-medium">
                                {cert.users.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {cert.users.email}
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs mt-1 capitalize"
                              >
                                {cert.users.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {cert.serial_number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(cert.issued_at).toLocaleDateString(
                                "id-ID"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(cert.expires_at).toLocaleDateString(
                                "id-ID"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(cert.status)}
                              {getStatusBadge(cert.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {cert.status === "active" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  revokeCertificate(cert.id, cert.users.name)
                                }
                              >
                                Cabut
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {certificates.map((cert) => (
                    <Card
                      key={cert.id}
                      className="border border-slate-200 shadow-md p-4 bg-gradient-to-r from-slate-50 to-slate-100/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {cert.users.name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {cert.users.email}
                          </p>
                        </div>
                        {getStatusBadge(cert.status)}
                      </div>
                      <div className="text-sm text-slate-700 space-y-1">
                        <p>
                          <span className="font-medium">Serial:</span>{" "}
                          {cert.serial_number}
                        </p>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Diterbitkan:{" "}
                          {new Date(cert.issued_at).toLocaleDateString("id-ID")}
                        </p>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Kadaluarsa:{" "}
                          {new Date(cert.expires_at).toLocaleDateString("id-ID")}
                        </p>
                        <p>
                          <span className="font-medium">Role:</span>{" "}
                          {cert.users.role}
                        </p>
                      </div>
                      {cert.status === "active" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() =>
                            revokeCertificate(cert.id, cert.users.name)
                          }
                        >
                          Cabut Sertifikat
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
