import { Eye, GraduationCap, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import IjazahPreview from "@/components/IjazahPreview";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { canCreateDocument } from "@/lib/documentAccess";

export default function CreateIjazahNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [rektorList, setRektorList] = useState<
    Array<{ id: string; name: string; nip: string }>
  >([]);

  const [formData, setFormData] = useState({
    nama_mahasiswa: "",
    nim: "",
    nama_fakultas: "",
    gelar: "",
    tanggal_terbit: new Date().toISOString().split("T")[0],
    template_id: "",
    logo_url:
      "https://muslimahnews.id/wp-content/uploads/2022/07/logo-umc-1009x1024-Reza-M-768x779-1.png",
    rektor_id: "",
  });

  // Check access
  const hasAccess =
    userProfile && canCreateDocument(userProfile.role, "ijazah");

  useEffect(() => {
    if (!hasAccess) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin untuk membuat ijazah",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [hasAccess, navigate, toast]);

  useEffect(() => {
    const fetchRektors = async () => {
      const { data: rektorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rektor");

      if (rektorRoles && rektorRoles.length > 0) {
        const rektorIds = rektorRoles.map((r) => r.user_id);
        const { data: rektors } = await supabase
          .from("users")
          .select("id, name, nip")
          .in("id", rektorIds);

        if (rektors) setRektorList(rektors as any);
      }
    };

    fetchRektors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userProfile) throw new Error("User not authenticated");

      // Create document with workflow metadata
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: userProfile.id,
          title: `Ijazah - ${formData.nama_mahasiswa}`,
          status: "pending",
          document_type: "ijazah",
          recipient_name: formData.nama_mahasiswa,
          recipient_student_number: formData.nim,
          metadata: {
            workflow_stage: "dekan_pending",
            rektor_id: formData.rektor_id,
            created_by_id: userProfile.id,
          },
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create ijazah record
      const { error: ijazahError } = await supabase.from("ijazah").insert([
        {
          document_id: document.id,
          nama_mahasiswa: formData.nama_mahasiswa,
          nim: formData.nim,
          gelar: formData.gelar,
          nama_fakultas: formData.nama_fakultas,
          tanggal_terbit: formData.tanggal_terbit,
          nomor_seri: "",
          logo_url: formData.logo_url,
          is_validated: false,
          template_id: formData.template_id || null,
        },
      ]);

      if (ijazahError) throw ijazahError;

      toast({
        title: "Berhasil",
        description:
          "Ijazah berhasil dibuat. Silakan tanda tangani untuk melanjutkan.",
      });

      navigate(`/user/documents/${document.id}/sign`);
    } catch (error) {
      console.error("Error creating ijazah:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Gagal membuat ijazah",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <CardTitle>Buat Ijazah Digital</CardTitle>
            </div>
            <CardDescription>
              Isi formulir di bawah untuk menerbitkan ijazah digital. Setelah
              dibuat, Anda akan diminta untuk menandatangani dokumen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Workflow Info */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-2">Alur Pembuatan Ijazah:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Isi data ijazah pada formulir</li>
                    <li>Preview ijazah sebelum dibuat</li>
                    <li>Buat ijazah dan tanda tangani</li>
                    <li>Dokumen dikirim ke Rektor untuk ditandatangani</li>
                    <li>Setelah Rektor tanda tangan, ijazah selesai</li>
                  </ol>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama_mahasiswa">Nama Mahasiswa *</Label>
                  <Input
                    id="nama_mahasiswa"
                    value={formData.nama_mahasiswa}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nama_mahasiswa: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nim">NIM *</Label>
                  <Input
                    id="nim"
                    value={formData.nim}
                    onChange={(e) =>
                      setFormData({ ...formData, nim: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nama_fakultas">Nama Fakultas *</Label>
                  <Input
                    id="nama_fakultas"
                    placeholder="Contoh: Teknik Informatika"
                    value={formData.nama_fakultas}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nama_fakultas: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gelar">Gelar *</Label>
                  <Input
                    id="gelar"
                    placeholder="Contoh: Sarjana Teknik (S.T.)"
                    value={formData.gelar}
                    onChange={(e) =>
                      setFormData({ ...formData, gelar: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_terbit">Tanggal Terbit *</Label>
                  <Input
                    id="tanggal_terbit"
                    type="date"
                    value={formData.tanggal_terbit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_terbit: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rektor">Rektor Penandatangan *</Label>
                  <Select
                    value={formData.rektor_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rektor_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Rektor" />
                    </SelectTrigger>
                    <SelectContent>
                      {rektorList.map((rektor) => (
                        <SelectItem key={rektor.id} value={rektor.id}>
                          {rektor.name}{" "}
                          {rektor.nip ? `(NIP: ${rektor.nip})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url}
                    onChange={(e) =>
                      setFormData({ ...formData, logo_url: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPreview(true)}
                  disabled={
                    !formData.nama_mahasiswa ||
                    !formData.nim ||
                    !formData.rektor_id
                  }
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Membuat..." : "Buat Ijazah"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <IjazahPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        formData={formData}
        dekanName={userProfile?.name}
        dekanNip={userProfile?.nip}
      />
    </DashboardLayout>
  );
}
