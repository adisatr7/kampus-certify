import { Calendar, Download, Edit, Eye, FileText, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import SignedDocumentViewer from "@/components/SignedDocumentViewer";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";

interface Document {
  id: string;
  title: string;
  file_url: string | null;
  status: "pending" | "signed" | "revoked";
  signed_at: string | null;
  created_at: string;
  user_id: string;
  qr_code_url?: string | null;
  content?: string | null;
  users: {
    name: string;
    email: string;
    role: string;
  };
}

export default function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [userId, setUserId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          users (
            name,
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat daftar dokumen",
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

  const uploadDocument = async () => {
    if (!title || !userId) {
      toast({
        title: "Error",
        description: "Judul dan user harus diisi",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;

      // Upload file to Supabase Storage if file is provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(filePath);

        fileUrl = publicUrl;
      }

      // Create document record
      const { error: insertError } = await supabase.from("documents").insert({
        title,
        content,
        user_id: userId,
        file_url: fileUrl,
        status: "pending",
      });

      if (insertError) throw insertError;

      const selectedUser = users.find((u) => u.id === userId);
      await createAuditEntry(
        userProfile.id,
        "CREATE_DOCUMENT",
        `Membuat dokumen "${title}" untuk ${selectedUser?.name}`,
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil diupload",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchDocuments();
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

  const deleteDocument = async (documentId: string, title: string) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", documentId);

      if (error) throw error;

      await createAuditEntry(userProfile.id, "DELETE_DOCUMENT", `Menghapus dokumen "${title}"`);

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil dihapus",
      });

      fetchDocuments();
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
    setContent("");
    setUserId("");
    setFile(null);
  };

  const handleViewDocument = (doc: Document) => {
    if (doc.status === "signed") {
      setSelectedDocument(doc);
      setIsViewerOpen(true);
    } else if (doc.file_url) {
      window.open(doc.file_url, "_blank");
    }
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
            <h1 className="text-3xl font-bold text-foreground">Manajemen Dokumen</h1>
            <p className="text-muted-foreground">Kelola dokumen untuk semua pengguna sistem</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Upload Dokumen Baru
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
                  <Label htmlFor="content">Konten Dokumen</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Masukkan isi konten dokumen..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Isi konten dokumen yang akan ditampilkan saat ditandatangani
                  </p>
                </div>

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
                  <Label htmlFor="file">File Dokumen (Opsional)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format yang didukung: PDF, DOC, DOCX (opsional, konten utama dari field di atas)
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
                  <Button onClick={uploadDocument} disabled={uploading}>
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
              Daftar Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada dokumen yang diupload</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul Dokumen</TableHead>
                    <TableHead>User</TableHead>
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
                        <div>
                          <div className="font-medium">{doc.users.name}</div>
                          <div className="text-sm text-muted-foreground">{doc.users.email}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {doc.users.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status as any} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(doc.created_at).toLocaleDateString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.signed_at ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(doc.signed_at).toLocaleDateString("id-ID")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.file_url && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                                title="Lihat dokumen"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (doc.status === "signed") {
                                    // For signed documents, trigger the formatted download
                                    setSelectedDocument(doc);
                                    setIsViewerOpen(true);
                                  } else {
                                    // For unsigned documents, direct download
                                    const link = document.createElement("a");
                                    link.href = doc.file_url!;
                                    link.download = `${doc.title}.${doc.file_url!.split(".").pop()}`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                }}
                                title="Download dokumen"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteDocument(doc.id, doc.title)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Signed Document Viewer */}
      {selectedDocument && (
        <SignedDocumentViewer
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}
    </DashboardLayout>
  );
}
