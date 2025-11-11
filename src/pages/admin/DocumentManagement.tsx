import {
  Calendar,
  Calendar1,
  Download,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import SignedDocumentViewer from "@/components/SignedDocumentViewer";
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
import useFetchAllDocuments from "@/hooks/document/useFetchAllDocuments";
import useFetchAllUsers from "@/hooks/user/useFetchAllUsers";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { generateDocumentSerial } from "@/lib/utils";
import { DocumentStatus, UserDocument, UserRole } from "@/types";

export default function DocumentManagement() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const {
    data: documents,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useFetchAllDocuments();
  const { data: listOfUsers } = useFetchAllUsers();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientStudentNumber, setRecipientStudentNumber] = useState("");
  const [userId, setUserId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const uploadDocument = async () => {
    if (!title || !content.trim() || !recipientName || !recipientStudentNumber || !userId) {
      toast({
        title: "Error",
        description: "Judul, isi, penandatangan, nama penerima, dan NIM wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let publicUrl = null;

      // Upload file to Supabase Storage if file is provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${userProfile.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("signed-documents")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL from the same bucket we uploaded to
        const {
          data: { publicUrl: url },
        } = supabase.storage.from("signed-documents").getPublicUrl(filePath);

        publicUrl = url;
      }

      // Create document record with content from textarea
      const { data: insertedRows, error: insertError } = await supabase
        .from("documents")
        .insert({
          title,
          content: content.trim(),
          user_id: userId,
          recipient_name: recipientName,
          recipient_student_number: recipientStudentNumber,
          file_url: publicUrl,
          status: "pending",
        })
        .select("id, created_at");

      if (insertError) {
        throw insertError;
      }

      const inserted = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
      if (!inserted || !inserted.id) {
        throw new Error("Failed to retrieve inserted document id");
      }

      // Compute and persist serial
      const serial = generateDocumentSerial(inserted.id, inserted.created_at);
      const { error: updateErr } = await supabase
        .from("documents")
        .update({ serial } as Partial<UserDocument>)
        .eq("id", inserted.id);
      if (updateErr) {
        throw updateErr;
      }

      const targetUser = listOfUsers?.find((u) => u.id === userId);
      const targetUserName = targetUser ? targetUser.name : userId;
      await createAuditEntry(
        userProfile.id,
        "CREATE_DOCUMENT",
        `Mengupload dokumen "${title}" untuk pengguna "${targetUserName}"`,
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil diupload",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      refetchDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengupload dokumen",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, title: string) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", documentId);
      if (error) {
        throw error;
      }

      await createAuditEntry(userProfile.id, "DELETE_DOCUMENT", `Menghapus dokumen "${title}"`);

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil dihapus",
      });

      refetchDocuments();
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
    setRecipientName("");
    setRecipientStudentNumber("");
    setFile(null);
  };

  const handleViewDocument = (doc: UserDocument) => {
    if (doc.status === "signed") {
      setSelectedDocument(doc);
      setIsViewerOpen(true);
    } else if (doc.file_url) {
      window.open(doc.file_url, "_blank");
    }
  };

  if (isLoadingDocuments) {
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
    <DashboardLayout userRole={userProfile?.role as UserRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Dokumen</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Kelola dokumen untuk semua pengguna sistem
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
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
                  <Label htmlFor="user">Pilih Penandatangan</Label>
                  <Select
                    value={userId}
                    onValueChange={setUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {listOfUsers.map((user) => (
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
                  <Label htmlFor="recipientName">Nama Penerima</Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Masukkan nama penerima"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientStudentNumber">NIM</Label>
                  <Input
                    id="recipientStudentNumber"
                    value={recipientStudentNumber}
                    onChange={(e) => setRecipientStudentNumber(e.target.value)}
                    placeholder="Masukkan NIM"
                  />
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
                    Format yang didukung: PDF, DOC, DOCX
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
                    disabled={isUploading}
                  >
                    {isUploading ? (
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

          {/* Desktop Table */}
          <CardContent className="hidden lg:block">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada dokumen yang diupload
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul Dokumen</TableHead>
                    <TableHead>Penandatangan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      {/* Judul Dokumen */}
                      <TableCell className="font-medium">{doc.title}</TableCell>

                      {/* Penandatangan */}
                      <TableCell>
                        <div className="font-semibold">{doc.user.name}</div>
                        <div className="text-sm text-muted-foreground">{doc.user.email}</div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={doc.status as DocumentStatus} />
                      </TableCell>

                      {/* Dibuat */}
                      <TableCell>{new Date(doc.created_at).toLocaleDateString("id-ID")}</TableCell>

                      {/* Aksi */}
                      <TableCell>
                        <div className="flex gap-2">
                          {doc.file_url && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = doc.file_url!;
                                  link.download = `${doc.title}`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
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

          {/* Mobile View - Scrollable Cards */}
          <CardContent className="visible lg:hidden max-h-[70vh] overflow-y-auto space-y-4 p-4">
            {documents.length === 0 ? (
              <div className="text-center py-6 text-slate-500">Belum ada dokumen yang diupload</div>
            ) : (
              documents.map((doc) => (
                <Card
                  key={doc.id}
                  className="p-4 rounded-xl shadow-sm flex items-start gap-3"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                        {doc.title}
                      </h3>
                      <StatusBadge status={doc.status as DocumentStatus} />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-200 mt-1">
                      {doc.user.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-200">{doc.user.email}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-300 mt-2">
                      <Calendar1 className="h-3 w-3 inline-block mr-1 text-muted-foreground" />
                      {new Date(doc.created_at).toLocaleDateString("id-ID")}
                    </p>
                    <div className="flex justify-end gap-2 mt-3">
                      {doc.file_url && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = doc.file_url!;
                              link.download = `${doc.title}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
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
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
