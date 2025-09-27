import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, FileText, Upload, Eye, Edit, Trash2, Calendar, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/audit";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface Document {
  id: string;
  title: string;
  file_url: string | null;
  status: 'pending' | 'signed' | 'revoked';
  signed_at: string | null;
  created_at: string;
}

export default function MyDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMyDocuments();
  }, [userProfile]);

  const fetchMyDocuments = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat dokumen Anda",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async () => {
    if (!title || !file || !userProfile) {
      toast({
        title: "Error",
        description: "Judul dan file dokumen harus diisi",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title,
          user_id: userProfile.id,
          file_url: publicUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      await createAuditEntry(
        userProfile.id,
        'CREATE_DOCUMENT',
        `Mengupload dokumen "${title}"`
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil diupload",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchMyDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengupload dokumen",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, documentTitle: string) => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userProfile.id); // Ensure user can only delete their own documents

      if (error) throw error;

      await createAuditEntry(
        userProfile.id,
        'DELETE_DOCUMENT',
        `Menghapus dokumen "${documentTitle}"`
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil dihapus",
      });

      fetchMyDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus dokumen",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setFile(null);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dokumen Saya</h1>
            <p className="text-muted-foreground">Kelola dokumen digital Anda</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Upload Dokumen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Dokumen Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Judul Dokumen</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Masukkan judul dokumen"
                  />
                </div>
                
                <div>
                  <Label htmlFor="file">File Dokumen</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format yang didukung: PDF, DOC, DOCX (Maks. 10MB)
                  </p>
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
                    onClick={uploadDocument}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
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
              <FileText className="h-5 w-5" />
              Daftar Dokumen ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Belum Ada Dokumen</h3>
                <p className="text-muted-foreground mb-4">
                  Mulai dengan mengupload dokumen pertama Anda
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Dokumen
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul Dokumen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead>Ditandatangani</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status as any} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(doc.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.signed_at ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(doc.signed_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.file_url && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.file_url!, '_blank')}
                                title="Lihat dokumen"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_url!;
                                  link.download = `${doc.title}.${doc.file_url!.split('.').pop()}`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                title="Download dokumen"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {doc.status === 'pending' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteDocument(doc.id, doc.title)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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