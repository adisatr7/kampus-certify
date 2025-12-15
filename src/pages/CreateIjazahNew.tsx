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
import { JENJANG_OPTIONS } from "@/types/IjazahTemplate";
import useFetchDocumentTemplates from "@/hooks/template/useFetchDocumentTemplates";

export default function CreateIjazahNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [rektorList, setRektorList] = useState<
    Array<{ id: string; name: string; nip: string }>
  >([]);

  // Fetch ijazah templates from database
  const { data: templates = [], isLoading: templatesLoading } =
    useFetchDocumentTemplates("ijazah");

  const [formData, setFormData] = useState({
    nama_mahasiswa: "",
    nim: "",
    nama_fakultas: "",
    gelar: "",
    jenjang: "S1", // Default to S1
    tanggal_terbit: new Date().toISOString().split("T")[0],
    template_id: "", // Will be set when templates load
    logo_url: "/logo-umc.svg", // Use existing logo as default
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

  // Set default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !formData.template_id) {
      setFormData((prev) => ({
        ...prev,
        template_id: templates[0].id,
      }));
    }
  }, [templates, formData.template_id]);

  useEffect(() => {
    const fetchRektors = async () => {
      try {
        console.log("🔍 Fetching rektors...");

        // Direct query from users table with role filter
        const { data: rektors, error } = await supabase
          .from("users")
          .select("id, name, nip, jabatan")
          .eq("role", "rektor")
          .order("name");

        console.log("👥 Rektors query result:", rektors);

        if (error) {
          console.error("❌ Error fetching rektors:", error);
          toast({
            title: "Error",
            description: "Gagal memuat daftar rektor: " + error.message,
            variant: "destructive",
          });
          return;
        }

        if (rektors && rektors.length > 0) {
          setRektorList(rektors as any);
          console.log("✅ Rektor list set:", rektors.length, "rektors");
        } else {
          console.warn("⚠️ No rektor found");
          toast({
            title: "Peringatan",
            description:
              "Tidak ada user dengan role rektor. Silakan buat user rektor terlebih dahulu.",
          });
        }
      } catch (error) {
        console.error("❌ Error in fetchRektors:", error);
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat memuat daftar rektor",
          variant: "destructive",
        });
      }
    };

    fetchRektors();
  }, [toast]);

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
            dekan_id: userProfile.id,
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
          jenjang: formData.jenjang,
          nama_fakultas: formData.nama_fakultas,
          tanggal_terbit: formData.tanggal_terbit,
          nomor_seri: "",
          logo_url: formData.logo_url,
          is_validated: false,
          template_id: formData.template_id || null,
          dekan_id: userProfile.id,
          rektor_id: formData.rektor_id,
        },
      ]);

      if (ijazahError) throw ijazahError;

      toast({
        title: "Berhasil",
        description: "Ijazah berhasil dibuat dan menunggu validasi.",
      });

      // Redirect berdasarkan role user
      const redirectPath =
        userProfile.role === "admin" ? "/admin/documents" : "/documents";
      navigate(redirectPath);
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
                    <li>Dekan membuat ijazah, input data manual pada form</li>
                    <li>
                      Setelah selesai menginput data, dapat preview terlebih
                      dahulu
                    </li>
                    <li>Setelah ijazah dibuat, dekan menandatangani ijazah</li>
                    <li>Pada nama dekan muncul QR code setelah tanda tangan</li>
                    <li>Status dokumen dekan berubah menjadi "signed"</li>
                    <li>Dokumen otomatis terkirim pada rektor yang dipilih</li>
                    <li>Rektor ttd dan isi QR code pada kotak rektor</li>
                    <li>Setelah rektor ttd, status berubah menjadi "signed"</li>
                    <li>
                      Ijazah selesai dan masuk ke tabel dokumen dekan dan rektor
                      dengan status signed
                    </li>
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
                  <Label htmlFor="jenjang">Jenjang *</Label>
                  <Select
                    value={formData.jenjang}
                    onValueChange={(value) =>
                      setFormData({ ...formData, jenjang: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENJANG_OPTIONS.map((jenjang) => (
                        <SelectItem key={jenjang.value} value={jenjang.value}>
                          {jenjang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="template">Template Ijazah *</Label>
                  <Select
                    value={formData.template_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, template_id: value })
                    }
                    disabled={templatesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          templatesLoading
                            ? "Memuat template..."
                            : templates.length === 0
                            ? "Tidak ada template tersedia"
                            : "Pilih Template"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
