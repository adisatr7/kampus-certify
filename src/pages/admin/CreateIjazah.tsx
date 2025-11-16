import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

export default function CreateIjazah() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_mahasiswa: "",
    nim: "",
    program_studi: "",
    gelar: "",
    tanggal_kelulusan: "",
    predikat: "",
    nomor_seri: "",
    tanggal_terbit: new Date().toISOString().split("T")[0],
    template_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create document first
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          title: `Ijazah - ${formData.nama_mahasiswa}`,
          status: "pending",
          document_type: "ijazah",
          metadata: {
            nama_mahasiswa: formData.nama_mahasiswa,
            nim: formData.nim,
          },
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create ijazah record
      const { error: ijazahError } = await supabase
        .from("ijazah")
        .insert({
          document_id: document.id,
          nama_mahasiswa: formData.nama_mahasiswa,
          nim: formData.nim,
          program_studi: formData.program_studi,
          gelar: formData.gelar,
          tanggal_kelulusan: formData.tanggal_kelulusan,
          predikat: formData.predikat || null,
          nomor_seri: formData.nomor_seri,
          tanggal_terbit: formData.tanggal_terbit,
          template_id: formData.template_id || null,
        });

      if (ijazahError) throw ijazahError;

      toast({
        title: "Berhasil",
        description: "Ijazah berhasil dibuat",
      });

      navigate("/admin/documents");
    } catch (error) {
      console.error("Error creating ijazah:", error);
      toast({
        title: "Error",
        description: "Gagal membuat ijazah",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
              Isi formulir di bawah untuk menerbitkan ijazah digital
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
                      setFormData({ ...formData, nama_mahasiswa: e.target.value })
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
                  <Label htmlFor="program_studi">Program Studi *</Label>
                  <Input
                    id="program_studi"
                    value={formData.program_studi}
                    onChange={(e) =>
                      setFormData({ ...formData, program_studi: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gelar">Gelar *</Label>
                  <Input
                    id="gelar"
                    placeholder="S.Kom, S.T, dll"
                    value={formData.gelar}
                    onChange={(e) =>
                      setFormData({ ...formData, gelar: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_kelulusan">Tanggal Kelulusan *</Label>
                  <Input
                    id="tanggal_kelulusan"
                    type="date"
                    value={formData.tanggal_kelulusan}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_kelulusan: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="predikat">Predikat</Label>
                  <Select
                    value={formData.predikat}
                    onValueChange={(value) =>
                      setFormData({ ...formData, predikat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih predikat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cum Laude">Cum Laude</SelectItem>
                      <SelectItem value="Sangat Memuaskan">Sangat Memuaskan</SelectItem>
                      <SelectItem value="Memuaskan">Memuaskan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomor_seri">Nomor Seri *</Label>
                  <Input
                    id="nomor_seri"
                    placeholder="0001-UMC-I-2025"
                    value={formData.nomor_seri}
                    onChange={(e) =>
                      setFormData({ ...formData, nomor_seri: e.target.value })
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
                      setFormData({ ...formData, tanggal_terbit: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/documents")}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Menyimpan..." : "Buat Ijazah"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
