import { Award } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";

export default function CreateSertifikat() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_peserta: "",
    nama_acara: "",
    tanggal_acara: "",
    nomor_sertifikat: "",
    penandatangan: "",
    template_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create document first
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          title: `Sertifikat - ${formData.nama_peserta}`,
          status: "pending",
          document_type: "sertifikat",
          metadata: {
            nama_peserta: formData.nama_peserta,
            nama_acara: formData.nama_acara,
          },
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create sertifikat record
      const { error: sertifikatError } = await supabase.from("sertifikat").insert({
        document_id: document.id,
        nama_peserta: formData.nama_peserta,
        nama_acara: formData.nama_acara,
        tanggal_acara: formData.tanggal_acara,
        nomor_sertifikat: formData.nomor_sertifikat,
        penandatangan: formData.penandatangan || null,
        template_id: formData.template_id || null,
      });

      if (sertifikatError) throw sertifikatError;

      toast({
        title: "Berhasil",
        description: "Sertifikat berhasil dibuat",
      });

      navigate("/admin/documents");
    } catch (error) {
      console.error("Error creating sertifikat:", error);
      toast({
        title: "Error",
        description: "Gagal membuat sertifikat",
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
              <Award className="h-6 w-6 text-primary" />
              <CardTitle>Buat Sertifikat Digital</CardTitle>
            </div>
            <CardDescription>
              Isi formulir di bawah untuk menerbitkan sertifikat digital
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama_peserta">Nama Peserta *</Label>
                  <Input
                    id="nama_peserta"
                    value={formData.nama_peserta}
                    onChange={(e) => setFormData({ ...formData, nama_peserta: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nama_acara">Nama Acara *</Label>
                  <Input
                    id="nama_acara"
                    value={formData.nama_acara}
                    onChange={(e) => setFormData({ ...formData, nama_acara: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_acara">Tanggal Acara *</Label>
                  <Input
                    id="tanggal_acara"
                    type="date"
                    value={formData.tanggal_acara}
                    onChange={(e) => setFormData({ ...formData, tanggal_acara: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomor_sertifikat">Nomor Sertifikat *</Label>
                  <Input
                    id="nomor_sertifikat"
                    placeholder="001/CERT/UMC/2025"
                    value={formData.nomor_sertifikat}
                    onChange={(e) => setFormData({ ...formData, nomor_sertifikat: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="penandatangan">Penandatangan</Label>
                  <Input
                    id="penandatangan"
                    placeholder="Nama penandatangan"
                    value={formData.penandatangan}
                    onChange={(e) => setFormData({ ...formData, penandatangan: e.target.value })}
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
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "Buat Sertifikat"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
