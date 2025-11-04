import axios from "axios";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
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
import { CertificateStatus } from "@/types/CertificateStatus";
import { SigningKey } from "@/types/SigningKey";

export default function CertificateManagement() {
  const [certificates, setCertificates] = useState<SigningKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [userId, setUserId] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() + 1);
    return defaultDate.toISOString().slice(0, 10); // YYYY-MM-DD for <input type="date">
  });

  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>(
    [],
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [changeKid, setChangeKid] = useState<string | null>(null);
  const [showChangePass, setShowChangePass] = useState(false);
  const [changeOldPass, setChangeOldPass] = useState("");
  const [changeNewPass, setChangeNewPass] = useState("");
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    fetchCertificates();
    fetchUsers();
  }, []);

  const getStatus = (key: SigningKey): CertificateStatus => {
    if (key.revoked_at) {
      return "revoked";
    } else if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return "expired";
    } else {
      return "active";
    }
  };

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from("signing_keys")
        .select(`
          kid,
          created_at,
          expires_at,
          revoked_at,
          assigned_to,
          assigned_to_user:assigned_to (
            name,
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const keysWithStatus: SigningKey[] = (data || []).map((key) => ({
        ...key,
        status: getStatus(key),
      }));
      setCertificates(keysWithStatus);
    } catch (error) {
      console.error(error);
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
    if (isCreating) return; // prevent duplicate submissions
    if (!userId || !expiresAt || !passphrase) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        createdBy: userProfile?.id,
        assignedTo: userId,
        expiresAt,
        passphrase: `CA${passphrase}`,
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-certificate`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        await createAuditEntry(
          userProfile.id,
          "CREATE_CERTIFICATE",
          `Membuat sertifikat untuk user ID ${userId}`,
        );

        toast({
          title: "Berhasil",
          description: `Sertifikat berhasil dibuat. KID: ${response.data.data.kid}`,
        });

        setIsCreateDialogOpen(false);
        resetForm();
        fetchCertificates();
      } else {
        toast({
          title: "Gagal",
          description: response.data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Gagal membuat sertifikat",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeCertificate = async (kid: string, userName: string) => {
    try {
      // Call server-side function to perform revoke using service role (bypasses RLS)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revoke-signing-key`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await axios.post(
        url,
        { kid },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data?.success) {
        await createAuditEntry(
          userProfile.id,
          "REVOKE_CERTIFICATE",
          `Mencabut signing key milik ${userName}`,
        );

        toast({
          title: "Berhasil",
          description: "Signing key berhasil dicabut",
        });

        fetchCertificates();
        return;
      }

      // Function returned an error payload
      throw new Error(response.data?.error || "Gagal mencabut signing key");
    } catch (err) {
      console.error("Failed to revoke certificate", err);
      toast({
        title: "Error",
        description: err?.message || "Gagal mencabut signing key",
        variant: "destructive",
      });
    }
  };

  // Change passphrase handler extracted from inline JSX
  const handleChangePassphrase = async () => {
    if (isChangingPass) return;
    if (!changeKid || !changeOldPass || !changeNewPass) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsChangingPass(true);
      const payload = {
        kid: changeKid,
        oldPassphrase: `CA${changeOldPass}`,
        newPassphrase: `CA${changeNewPass}`,
        changedBy: userProfile?.id,
      };
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-passphrase`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.data?.success) {
        await createAuditEntry(
          userProfile.id,
          "CHANGE_PASSPHRASE",
          `Mengganti passphrase untuk KID ${changeKid}`,
        );
        toast({ title: "Berhasil", description: "Passphrase berhasil diubah" });
        setIsChangeDialogOpen(false);
        setChangeKid(null);
        setChangeOldPass("");
        setChangeNewPass("");
        fetchCertificates();
      } else {
        throw new Error(res.data?.error || "Gagal mengubah passphrase");
      }
    } catch (err) {
      console.error("change passphrase failed", err);
      const e = err as unknown as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const serverMessage = e.response?.data?.error || e.message || String(err);
      toast({
        title: "Error",
        description: serverMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  const resetForm = () => {
    setUserId("");
    setExpiresAt("");
    setPassphrase("");
  };

  const getStatusIcon = (status: CertificateStatus) => {
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

  const getStatusBadge = (status: CertificateStatus) => {
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
      <DashboardLayout userRole={userProfile?.role}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userProfile?.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manajemen Sertifikat</h1>
            <p className="text-muted-foreground">
              Kelola sertifikat digital untuk penandatanganan dokumen
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
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
                  <Select
                    value={userId}
                    onValueChange={setUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem
                          key={user.id}
                          value={user.id}
                        >
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expiresAt">Tanggal Kadaluarsa</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    required
                    className="w-full pr-10"
                  />
                </div>

                <div>
                  <Label htmlFor="passphrase">Passphrase</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
                      CA
                    </span>
                    <Input
                      id="passphrase"
                      type={showPassphrase ? "text" : "password"}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="******"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      {showPassphrase ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
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
                  <Button
                    onClick={generateCertificate}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Membuat...
                      </span>
                    ) : (
                      "Buat Sertifikat"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Change Passphrase Dialog */}
          <Dialog
            open={isChangeDialogOpen}
            onOpenChange={setIsChangeDialogOpen}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ganti Passphrase Sertifikat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Passphrase Lama</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
                      CA
                    </span>
                    <Input
                      type={showChangePass ? "text" : "password"}
                      value={changeOldPass}
                      onChange={(e) => setChangeOldPass(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangePass(!showChangePass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      {showChangePass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Passphrase Baru</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
                      CA
                    </span>
                    <Input
                      type={showChangePass ? "text" : "password"}
                      value={changeNewPass}
                      onChange={(e) => setChangeNewPass(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangePass(!showChangePass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      {showChangePass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsChangeDialogOpen(false);
                      setChangeKid(null);
                      setChangeOldPass("");
                      setChangeNewPass("");
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleChangePassphrase}
                    disabled={isChangingPass}
                  >
                    {isChangingPass ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Mengganti...
                      </span>
                    ) : (
                      "Ganti Passphrase"
                    )}
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

          <CardContent className="hidden lg:block">
            {certificates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada sertifikat yang dibuat
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>KID</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead>Kadaluarsa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.kid}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cert.assigned_to_user?.name || "-"}</div>
                          <div className="text-sm text-muted-foreground">
                            {cert.assigned_to_user?.email || "-"}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs mt-1"
                          >
                            {cert.assigned_to_user?.role || "Unknown"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{cert.kid}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(cert.created_at).toLocaleDateString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.expires_at ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(cert.expires_at).toLocaleDateString("id-ID")}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(cert.status!)}
                          {getStatusBadge(cert.status!)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatus(cert) === "active" && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                revokeCertificate(cert.kid, cert.assigned_to_user?.name || "-")
                              }
                            >
                              Cabut
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setChangeKid(cert.kid);
                                setIsChangeDialogOpen(true);
                              }}
                            >
                              Ganti Passphrase
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          <CardContent className="block lg:hidden max-h-[70vh] overflow-y-auto space-y-4 p-4">
            {certificates.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Belum ada sertifikat yang dibuat
              </div>
            ) : (
              certificates.map((cert) => (
                <Card
                  key={cert.kid}
                  className="p-4 rounded-xl shadow-sm flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-slate-800 dark:text-white">
                        {cert.assigned_to_user?.name || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {cert.assigned_to_user?.email || "-"}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs mt-1"
                      >
                        {cert.assigned_to_user?.role || "Unknown"}
                      </Badge>
                    </div>
                    <div>{getStatusBadge(cert.status!)}</div>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Dibuat: {new Date(cert.created_at).toLocaleDateString("id-ID")}
                    </div>
                    {cert.expires_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Kadaluarsa: {new Date(cert.expires_at).toLocaleDateString("id-ID")}
                      </div>
                    )}
                  </div>

                  {getStatus(cert) === "active" && (
                    <div className="flex justify-end">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            revokeCertificate(cert.kid, cert.assigned_to_user?.name || "-")
                          }
                        >
                          Cabut
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setChangeKid(cert.kid);
                            setIsChangeDialogOpen(true);
                          }}
                        >
                          Ganti Passphrase
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
