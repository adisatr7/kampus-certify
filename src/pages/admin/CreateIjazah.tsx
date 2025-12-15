import { Eye, GraduationCap, AlertCircle } from "lucide-react";
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
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { canCreateDocument } from "@/lib/documentAccess";
import { JENJANG_OPTIONS } from "@/types/IjazahTemplate";
import useFetchDocumentTemplates from "@/hooks/template/useFetchDocumentTemplates";

export default function CreateIjazah() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dekanList, setDekanList] = useState<
    Array<{ id: string; name: string; nip: string; jabatan?: string }>
  >([]);
  const [rektorList, setRektorList] = useState<
    Array<{ id: string; name: string; nip: string; jabatan?: string }>
  >([]);

  // Fetch ijazah templates from database
  const { data: templates = [], isLoading: templatesLoading } =
    useFetchDocumentTemplates("ijazah");

  const [formData, setFormData] = useState({
    nama_mahasiswa: "",
    nim: "",
    nama_fakultas: "",
    program_studi: "",
    gelar: "",
    jenjang: "S1", // Default to S1
    angkatan: "",
    predikat: "",
    tanggal_lulus: new Date().toISOString().split("T")[0],
    tanggal_terbit: new Date().toISOString().split("T")[0],
    template_id: "", // Will be set when templates load
    logo_url: "/logo-umc.svg", // Use existing logo as default
    dekan_id: "",
    rektor_id: "",
  });

  useEffect(() => {
    // Fetch dekan and rektor directly from users table
    const fetchUsers = async () => {
      // Get dekans
      const { data: dekans } = await supabase
        .from("users")
        .select("id, name, nip, jabatan")
        .eq("role", "dekan")
        .order("name");

      if (dekans) setDekanList(dekans as any);

      // Get rektors
      const { data: rektors } = await supabase
        .from("users")
        .select("id, name, nip, jabatan")
        .eq("role", "rektor")
        .order("name");

      if (rektors) setRektorList(rektors as any);
    };

    fetchUsers();
  }, []);

  // Set default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !formData.template_id) {
      setFormData((prev) => ({
        ...prev,
        template_id: templates[0].id,
      }));
    }
  }, [templates, formData.template_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get dekan and rektor details
      const dekan = dekanList.find((d) => d.id === formData.dekan_id);
      const rektor = rektorList.find((r) => r.id === formData.rektor_id);

      if (!dekan || !rektor) {
        throw new Error("Dekan atau Rektor tidak ditemukan");
      }

      // Create document first (needed for ijazah.document_id which is UUID type)
      // Document will be assigned to dekan first (first signer in workflow)
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: formData.dekan_id,
          title: `Ijazah - ${formData.nama_mahasiswa}`,
          status: "pending",
          document_type: "ijazah",
          recipient_name: formData.nama_mahasiswa,
          recipient_student_number: formData.nim,
          metadata: {
            workflow_stage: "dekan_pending",
            rektor_id: formData.rektor_id,
            dekan_id: formData.dekan_id,
            dekan_signed: false,
            rektor_signed: false,
          },
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create ijazah record with valid document_id
      const { data: ijazahData, error: ijazahError } = await supabase
        .from("ijazah")
        .insert({
          document_id: document.id,
          nama_mahasiswa: formData.nama_mahasiswa,
          nim: formData.nim,
          gelar: formData.gelar,
          jenjang: formData.jenjang,
          nama_fakultas: formData.nama_fakultas,
          program_studi: formData.program_studi,
          angkatan: formData.angkatan,
          predikat: formData.predikat,
          tanggal_lulus: formData.tanggal_lulus,
          tanggal_terbit: formData.tanggal_terbit,
          nomor_seri: "",
          logo_url: formData.logo_url,
          is_validated: false,
          template_id: formData.template_id || null,
          dekan_id: formData.dekan_id,
          rektor_id: formData.rektor_id,
        })
        .select()
        .single();

      if (ijazahError) throw ijazahError;

      // Update document metadata with ijazah_id for tracking
      const { error: metadataError } = await supabase
        .from("documents")
        .update({
          metadata: {
            workflow_stage: "dekan_pending",
            ijazah_id: ijazahData.id,
            rektor_id: formData.rektor_id,
            dekan_id: formData.dekan_id,
            dekan_signed: false,
            rektor_signed: false,
          },
        })
        .eq("id", document.id);

      if (metadataError) throw metadataError;

      // Create audit entry
      await createAuditEntry(
        user.id,
        "CREATE_IJAZAH",
        `Membuat ijazah untuk ${formData.nama_mahasiswa} (NIM: ${formData.nim})`
      );

      toast({
        title: "Berhasil",
        description: "Ijazah berhasil dibuat dan menunggu validasi Dekan",
      });

      navigate("/admin/documents");
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

  const { userProfile } = useAuth();

  return (
    <DashboardLayout userRole={userProfile?.role}>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <CardTitle>Buat Ijazah Digital</CardTitle>
            </div>
            <CardDescription>
              Isi formulir di bawah untuk menerbitkan ijazah digital. Nomor seri
              akan dibuat otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    placeholder="Contoh: Fakultas Teknik"
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
                  <Label htmlFor="program_studi">Program Studi *</Label>
                  <Input
                    id="program_studi"
                    placeholder="Contoh: Teknik Informatika"
                    value={formData.program_studi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        program_studi: e.target.value,
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
                  <Label htmlFor="angkatan">Angkatan/Periode Belajar *</Label>
                  <Input
                    id="angkatan"
                    placeholder="Contoh: 2020/2021 - 2024/2025"
                    value={formData.angkatan}
                    onChange={(e) =>
                      setFormData({ ...formData, angkatan: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="predikat">Predikat Kelulusan *</Label>
                  <Select
                    value={formData.predikat}
                    onValueChange={(value) =>
                      setFormData({ ...formData, predikat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Predikat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cum Laude">Cum Laude</SelectItem>
                      <SelectItem value="Sangat Memuaskan">
                        Sangat Memuaskan
                      </SelectItem>
                      <SelectItem value="Memuaskan">Memuaskan</SelectItem>
                      <SelectItem value="Cukup">Cukup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_lulus">Tanggal Lulus *</Label>
                  <Input
                    id="tanggal_lulus"
                    type="date"
                    value={formData.tanggal_lulus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_lulus: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_terbit">Tanggal Penerbitan *</Label>
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
                  <Label htmlFor="dekan">Dekan *</Label>
                  <Select
                    value={formData.dekan_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, dekan_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Dekan" />
                    </SelectTrigger>
                    <SelectContent>
                      {dekanList.map((dekan) => (
                        <SelectItem key={dekan.id} value={dekan.id}>
                          {dekan.name} {dekan.nip ? `(NIP: ${dekan.nip})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rektor">Rektor *</Label>
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
                  onClick={() => navigate("/admin/documents")}
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
                    !formData.dekan_id
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
        dekanName={dekanList.find((d) => d.id === formData.dekan_id)?.name}
        dekanNip={dekanList.find((d) => d.id === formData.dekan_id)?.nip}
        dekanJabatan={
          dekanList.find((d) => d.id === formData.dekan_id)?.jabatan
        }
        rektorName={rektorList.find((r) => r.id === formData.rektor_id)?.name}
        rektorNip={rektorList.find((r) => r.id === formData.rektor_id)?.nip}
        rektorJabatan={
          rektorList.find((r) => r.id === formData.rektor_id)?.jabatan
        }
      />
    </DashboardLayout>
  );
}
