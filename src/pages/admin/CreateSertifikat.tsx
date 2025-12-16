import { Award, AlertCircle, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import SertifikatPreview from "@/components/SertifikatPreview";
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
import useFetchDocumentTemplates from "@/hooks/template/useFetchDocumentTemplates";

export default function CreateSertifikat() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [userList, setUserList] = useState<
    Array<{ id: string; name: string; nip: string; jabatan?: string }>
  >([]);

  // Fetch sertifikat templates from database
  const { data: templates = [], isLoading: templatesLoading } =
    useFetchDocumentTemplates("sertifikat");

  const [formData, setFormData] = useState({
    nama_peserta: "",
    nim: "",
    nama_acara: "",
    tanggal_acara: "",
    jenis_sertifikat: "pelatihan",
    penyelenggara: "",
    signer1_id: "",
    signer2_id: "",
    template_id: "",
  });

  // Set default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !formData.template_id) {
      setFormData((prev) => ({
        ...prev,
        template_id: templates[0].id,
      }));
    }
  }, [templates, formData.template_id]);

  // Generate nomor sertifikat otomatis: XXXX/CERT/UMC/YYYY
  const generateNomorSertifikat = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit random (1000-9999)
    const year = new Date().getFullYear();
    return `${randomNum}/CERT/UMC/${year}`;
  };

  // Fetch users for signers
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Direct query from users table
        const { data: users } = await supabase
          .from("users")
          .select("id, name, nip, jabatan, role")
          .order("name");

        if (users) setUserList(users as any);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Gagal memuat daftar penandatangan",
          variant: "destructive",
        });
      }
    };

    fetchUsers();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userProfile) throw new Error("User not authenticated");

      // Create document with workflow metadata
      // user_id diset ke signer1_id agar sertifikat langsung masuk ke daftar dokumen penandatangan pertama
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: formData.signer1_id,
          title: `Sertifikat - ${formData.nama_peserta}`,
          status: "pending",
          document_type: "sertifikat",
          recipient_name: formData.nama_peserta,
          metadata: {
            workflow_stage: "pending_signer1",
            signer1_id: formData.signer1_id,
            signer2_id: formData.signer2_id || null,
            created_by_id: userProfile.id,
          },
        })
        .select()
        .single();

      if (docError) throw docError;

      // Generate nomor sertifikat otomatis
      const nomorSertifikat = generateNomorSertifikat();

      // Create sertifikat record
      const { error: sertifikatError } = await supabase
        .from("sertifikat")
        .insert({
          document_id: document.id,
          nama_peserta: formData.nama_peserta,
          nim: formData.nim || null,
          nama_acara: formData.nama_acara,
          jenis_sertifikat: formData.jenis_sertifikat,
          penyelenggara: formData.penyelenggara,
          tanggal_acara: formData.tanggal_acara,
          nomor_sertifikat: nomorSertifikat,
          penandatangan: formData.signer1_id,
          template_id: formData.template_id || "default",
        });

      if (sertifikatError) throw sertifikatError;

      // Create audit entry
      await createAuditEntry(
        userProfile.id,
        "CREATE_SERTIFIKAT",
        `Membuat sertifikat untuk ${formData.nama_peserta} - ${formData.nama_acara}`
      );

      toast({
        title: "Berhasil",
        description:
          "Sertifikat berhasil dibuat dan dikirim ke penandatangan pertama",
      });

      // Redirect berdasarkan role user
      const redirectPath =
        userProfile.role === "admin" ? "/admin/documents" : "/documents";
      navigate(redirectPath);
    } catch (error) {
      console.error("Error creating sertifikat:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Gagal membuat sertifikat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole={userProfile?.role}>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              <CardTitle>Buat Sertifikat Digital</CardTitle>
            </div>
            <CardDescription>
              Isi formulir di bawah untuk menerbitkan sertifikat digital dengan
              penandatangan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Workflow Info */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-2">
                    Alur Pembuatan Sertifikat:
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Isi data sertifikat dan pilih penandatangan</li>
                    <li>Preview sertifikat sebelum dibuat</li>
                    <li>Buat sertifikat dan kirim ke penandatangan pertama</li>
                    <li>Penandatangan pertama menandatangani</li>
                    <li>Otomatis dikirim ke penandatangan kedua (jika ada)</li>
                    <li>
                      Setelah semua penandatangan selesai, sertifikat selesai
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama_peserta">Nama Peserta *</Label>
                  <Input
                    id="nama_peserta"
                    value={formData.nama_peserta}
                    onChange={(e) =>
                      setFormData({ ...formData, nama_peserta: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nim">NIM (Opsional)</Label>
                  <Input
                    id="nim"
                    placeholder="Masukkan NIM jika peserta adalah mahasiswa"
                    value={formData.nim}
                    onChange={(e) =>
                      setFormData({ ...formData, nim: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template_id">Template Sertifikat *</Label>
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
                  <Label htmlFor="jenis_sertifikat">Jenis Sertifikat *</Label>
                  <Select
                    value={formData.jenis_sertifikat}
                    onValueChange={(value) =>
                      setFormData({ ...formData, jenis_sertifikat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pelatihan">
                        Sertifikat Pelatihan
                      </SelectItem>
                      <SelectItem value="ujian_kompetensi">
                        Ujian Kompetensi
                      </SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                      <SelectItem value="juara_lomba">Juara Lomba</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nama_acara">Nama Kegiatan *</Label>
                  <Input
                    id="nama_acara"
                    value={formData.nama_acara}
                    onChange={(e) =>
                      setFormData({ ...formData, nama_acara: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penyelenggara">Penyelenggara *</Label>
                  <Input
                    id="penyelenggara"
                    value={formData.penyelenggara}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        penyelenggara: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_acara">Tanggal Pelaksanaan *</Label>
                  <Input
                    id="tanggal_acara"
                    type="date"
                    value={formData.tanggal_acara}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_acara: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signer1">Penandatangan 1 *</Label>
                  <Select
                    value={formData.signer1_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, signer1_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih penandatangan pertama" />
                    </SelectTrigger>
                    <SelectContent>
                      {userList.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.nip ? `(NIP: ${user.nip})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signer2">Penandatangan 2 (Opsional)</Label>
                  <Select
                    value={formData.signer2_id || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        signer2_id: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih penandatangan kedua (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Tidak ada penandatangan kedua
                      </SelectItem>
                      {userList.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.nip ? `(NIP: ${user.nip})` : ""}
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
                  onClick={() =>
                    navigate(
                      userProfile?.role === "admin"
                        ? "/admin/documents"
                        : "/documents"
                    )
                  }
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPreview(true)}
                  disabled={
                    !formData.nama_peserta ||
                    !formData.nama_acara ||
                    !formData.signer1_id
                  }
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.nama_peserta ||
                    !formData.nama_acara ||
                    !formData.signer1_id
                  }
                >
                  {loading ? "Membuat..." : "Buat Sertifikat"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <SertifikatPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        formData={formData}
        signer1Name={userList.find((u) => u.id === formData.signer1_id)?.name}
        signer1Jabatan={
          userList.find((u) => u.id === formData.signer1_id)?.jabatan
        }
        signer1Nip={userList.find((u) => u.id === formData.signer1_id)?.nip}
        signer2Name={
          formData.signer2_id
            ? userList.find((u) => u.id === formData.signer2_id)?.name
            : undefined
        }
        signer2Jabatan={
          formData.signer2_id
            ? userList.find((u) => u.id === formData.signer2_id)?.jabatan
            : undefined
        }
        signer2Nip={
          formData.signer2_id
            ? userList.find((u) => u.id === formData.signer2_id)?.nip
            : undefined
        }
      />
    </DashboardLayout>
  );
}
