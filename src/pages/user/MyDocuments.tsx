import {
  Calendar,
  Check,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Activity as LucideActivity,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import useFetchDocumentsByUserId from "@/hooks/document/useFetchDocumentsByUserId";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { DocumentStatus, UserDocument, UserRole } from "@/types";

export default function MyDocuments() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const {
    data: documents,
    isLoading,
    refetch: refetchDocument,
  } = useFetchDocumentsByUserId(userProfile?.id ?? "");

  const [filteredDocuments, setFilteredDocuments] = useState<UserDocument[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, statusFilter]);

  const filterDocuments = () => {
    let filtered = documents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((doc) =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    setFilteredDocuments(filtered);
  };

  const uploadDocument = async () => {
    if (!title || !content.trim() || !userProfile) {
      toast({
        title: "Error",
        description: "Judul dan isi dokumen harus diisi",
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
      const { error: insertError } = await supabase.from("documents").insert({
        title,
        content: content.trim(),
        user_id: userProfile.id,
        file_url: publicUrl,
        status: "pending",
      });

      if (insertError) {
        throw insertError;
      }

      await createAuditEntry(userProfile.id, "CREATE_DOCUMENT", `Mengupload dokumen "${title}"`);

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil diupload",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      refetchDocument();
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

  const deleteDocument = async (documentId: string, documentTitle: string) => {
    if (!userProfile) {
      return;
    }

    try {
      // Request the deleted row(s) back so we can confirm deletion succeeded.
      const { data, error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("user_id", userProfile.id);

      if (error) {
        throw error;
      }

      await createAuditEntry(
        userProfile.id,
        "DELETE_DOCUMENT",
        `Menghapus dokumen "${documentTitle}"`,
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus dokumen",
        variant: "destructive",
      });
    } finally {
      refetchDocument();
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
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

  const getDocumentStats = () => {
    const total = documents.length;
    const signed = documents.filter((d) => d.status === "signed").length;
    const pending = documents.filter((d) => d.status === "pending").length;
    const revoked = documents.filter((d) => d.status === "revoked").length;
    return { total, signed, pending, revoked };
  };

  const stats = getDocumentStats();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:bg-zinc-800">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Memuat Dokumen
              </h3>
              <p className="text-slate-500 dark:text-slate-400">Mengambil daftar dokumen Anda...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userProfile?.role as UserRole}>
      <div className="min-h-screen">
        <div className="space-y-8 p-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text dark:bg-none dark:bg-slate-100 text-transparent">
                Dokumen Saya
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                Kelola dokumen digital Anda dengan mudah dan aman
              </p>

              {/* Mobile: Upload button under title */}
              <div className="mt-2 md:hidden">
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                      <Plus className="mr-1 h-4 w-4" />
                      Upload Dokumen
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>

            {/* Desktop / tablet upload button (original position) */}
            <div className="hidden md:block">
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="mr-1 h-4 w-4" />
                    Upload Dokumen
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md backdrop-blur-sm border-0 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Upload Dokumen Baru
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="title"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Judul Dokumen *
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Masukkan judul dokumen"
                        className="mt-1 border-slate-300"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="content"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Isi Dokumen *
                      </Label>
                      <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Masukkan isi dokumen yang akan ditandatangani..."
                        className="mt-1 w-full min-h-[200px] px-3 py-2 border border-slate-300 rounded-md resize-y bg-background"
                        rows={10}
                      />
                      <p className="text-xs text-slate-500 dark:text-zinc-300 mt-2 bg-slate-50 dark:bg-zinc-800 p-2 rounded">
                        Isi dokumen ini akan ditampilkan pada dokumen yang telah ditandatangani
                      </p>
                    </div>

                    <div>
                      <Label
                        htmlFor="file"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                      >
                        File Dokumen (Opsional)
                      </Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="mt-1 border-slate-300"
                      />
                      <p className="text-xs text-slate-500 dark:text-zinc-300 mt-2 bg-slate-50 dark:bg-zinc-800 p-2 rounded">
                        File referensi (opsional): PDF, DOC, DOCX (Maks. 10MB)
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetForm();
                        }}
                        className="border-slate-300"
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={uploadDocument}
                        disabled={isUploading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-w-[100px]"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">
                      Total Dokumen
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-200">
                      {stats.total}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-700">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">
                      Ditandatangani
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.signed}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-700">
                    <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">
                      Menunggu
                    </p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {stats.pending}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-700">
                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">Dicabut</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {stats.revoked}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-700">
                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card className="shadow-lg backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cari dokumen berdasarkan judul..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-slate-300 dark:border-zinc-600"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | "all")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm dark:bg-zinc-700/50 dark:border-zinc-600"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu</option>
                    <option value="signed">Ditandatangani</option>
                    <option value="revoked">Dicabut</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card className="shadow-lg backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200/60">
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                Daftar Dokumen ({filteredDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {documents.length === 0 ? (
                <div className="text-center py-16 dark:text-slate-100">
                  <div className="p-4 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 w-fit mx-auto mb-6">
                    <FileText className="h-16 w-16 text-blue-600 dark:text-blue-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                    Belum Ada Dokumen
                  </h3>
                  <p className="text-slate-500 dark:text-slate-300 mb-6 max-w-md mx-auto">
                    Mulai dengan mengupload dokumen pertama Anda untuk memulai proses
                    penandatanganan digital
                  </p>
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Dokumen Pertama
                    </Button>
                  </div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12 dark:text-slate-100">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-zinc-700 w-fit mx-auto mb-4">
                    <Search className="h-12 w-12 text-slate-400 dark:text-zinc-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Tidak Ada Hasil
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Tidak ada dokumen yang sesuai dengan filter pencarian Anda
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="border-slate-300 dark:border-zinc-600 dark:text-zinc-300"
                  >
                    Reset Filter
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop Table (visible md+) */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-zinc-800/50">
                          <TableHead className="font-semibold">Dokumen</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Dibuat</TableHead>
                          <TableHead className="font-semibold">Ditandatangani</TableHead>
                          <TableHead className="font-semibold text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded-lg ${
                                    doc.status === "signed"
                                      ? "bg-emerald-100 dark:bg-emerald-900/20"
                                      : doc.status === "pending"
                                        ? "bg-amber-100 dark:bg-amber-900/20"
                                        : "bg-red-100 dark:bg-red-900/20"
                                  }`}
                                >
                                  <FileText
                                    className={`h-5 w-5 ${
                                      doc.status === "signed"
                                        ? "text-emerald-600 dark:text-emerald-300"
                                        : doc.status === "pending"
                                          ? "text-amber-600 dark:text-amber-300"
                                          : "text-red-600 dark:text-red-300"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {doc.title}
                                  </span>
                                  <p className="text-sm text-slate-500 dark:text-zinc-300">
                                    Dokumen digital
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={doc.status as DocumentStatus} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400 dark:text-zinc-400" />
                                <span className="text-sm text-slate-600 dark:text-zinc-300">
                                  {new Date(doc.created_at).toLocaleDateString("id-ID")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {doc.status !== "pending" && doc.updated_at ? (
                                <div className="flex items-center gap-2">
                                  {doc.status === "signed" && (
                                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                                  )}
                                  {doc.status === "revoked" && (
                                    <X className="h-4 w-4 text-red-500 dark:text-red-300" />
                                  )}
                                  <span className="text-sm text-slate-600 dark:text-zinc-300">
                                    {new Date(doc.updated_at).toLocaleDateString("id-ID")}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm dark:text-zinc-500">
                                  Belum ditandatangani
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {doc.file_url && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDocument(doc)}
                                      title="Lihat dokumen"
                                      className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800/40"
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
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/30"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {doc.status === "pending" && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteDocument(doc.id, doc.title)}
                                    title="Hapus dokumen"
                                    className="hover:bg-red-600 dark:hover:bg-red-700"
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
                  </div>

                  {/* Mobile Card View (visible on small screens) */}
                  <div className="block md:hidden">
                    {/* Use a scrollable container and card style similar to the example you provided */}
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {filteredDocuments.map((doc) => (
                        <Card
                          key={doc.id}
                          className="border-0 shadow-lg bg-white/80 dark:bg-zinc-800/60 backdrop-blur-sm"
                        >
                          <CardHeader className="border-b border-slate-200/60 dark:border-zinc-700/60">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
                                <FileText className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {doc.title}
                                </CardTitle>
                                <p className="text-sm text-slate-600 dark:text-zinc-300 truncate">
                                  {doc.file_url
                                    ? "Dokumen dengan lampiran"
                                    : "Dokumen (tanpa lampiran)"}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <StatusBadge status={doc.status as DocumentStatus} />
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4">
                            <p className="text-sm text-slate-700 dark:text-zinc-300 mb-1">
                              {doc.content
                                ? doc.content.length > 120
                                  ? doc.content.slice(0, 120) + "..."
                                  : doc.content
                                : "Tidak ada ringkasan."}
                            </p>

                            <div className="flex flex-col text-xs text-slate-500 dark:text-zinc-400 mb-4 mr-auto">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400 dark:text-zinc-400" />
                                <span>{new Date(doc.created_at).toLocaleDateString("id-ID")}</span>
                              </div>
                              {/* Note: Looks ugly but kept here in case it's needed sometime */}
                              {/* <div className="flex items-center gap-2">
                                <LucideActivity className="h-4 w-4 text-slate-400 dark:text-zinc-400" />
                                <span className="dark:text-zinc-300">
                                  {doc.updated_at
                                    ? new Date(doc.updated_at).toLocaleDateString("id-ID")
                                    : "Belum ditandatangani"}
                                </span>
                              </div> */}
                            </div>

                            <div className="flex items-center gap-2">
                              {doc.file_url && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDocument(doc)}
                                    className="flex-1 text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800/40"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Lihat
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (doc.status === "signed") {
                                        setSelectedDocument(doc);
                                        setIsViewerOpen(true);
                                      } else {
                                        const link = document.createElement("a");
                                        link.href = doc.file_url!;
                                        link.download = `${doc.title}.${doc.file_url!.split(".").pop()}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }
                                    }}
                                    className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/30"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                </>
                              )}

                              {doc.status === "pending" && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteDocument(doc.id, doc.title)}
                                  className="flex-1 hover:bg-red-600 dark:hover:bg-red-700"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Hapus
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
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
