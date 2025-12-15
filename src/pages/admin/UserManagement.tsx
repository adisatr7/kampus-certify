import { Pencil, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useCreateUser } from "@/hooks/user/useCreateUser";
import { useDeleteUser } from "@/hooks/user/useDeleteUser";
import useFetchAllUsers from "@/hooks/user/useFetchAllUsers";
import { useUpdateUser } from "@/hooks/user/useUpdateUser";
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { User, UserRole } from "@/types";

export default function UserManagement() {
  const { userProfile } = useAuth();
  const { data: users, isLoading, refetch } = useFetchAllUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "dosen" as UserRole,
    nip: "",
    jabatan: "",
  });

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      role: "dosen",
      nip: "",
      jabatan: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser.mutateAsync(formData);

    // Audit log
    if (userProfile?.id) {
      await createAuditEntry(
        userProfile.id,
        "CREATE_USER",
        `Membuat pengguna baru: ${formData.name} (${formData.email}) dengan role ${formData.role}`
      );
    }

    setIsCreateDialogOpen(false);
    resetForm();
    refetch();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await updateUser.mutateAsync({
      id: editingUser.id,
      ...formData,
    });

    // Audit log
    if (userProfile?.id) {
      await createAuditEntry(
        userProfile.id,
        "UPDATE_USER",
        `Memperbarui pengguna: ${formData.name} (${formData.email})`
      );
    }

    setIsEditDialogOpen(false);
    setEditingUser(null);
    resetForm();
    refetch();
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    const deletedUserName = userToDelete.name;
    const deletedUserEmail = userToDelete.email;

    await deleteUser.mutateAsync(userToDelete.id);

    // Audit log
    if (userProfile?.id) {
      await createAuditEntry(
        userProfile.id,
        "DELETE_USER",
        `Menghapus pengguna: ${deletedUserName} (${deletedUserEmail})`
      );
    }

    setUserToDelete(null);
    refetch();
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email || "",
      name: user.name,
      role: user.role,
      nip: user.nip || "",
      jabatan: user.jabatan || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <DashboardLayout userRole={userProfile?.role}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Manajemen Pengguna
            </h1>
            <p className="text-muted-foreground mt-1">
              Kelola akun pengguna yang dapat mengakses sistem
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <UserPlus className="mr-2 h-4 w-4" />
                Tambah Pengguna
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Pengguna Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Google</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="user@example.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email yang akan digunakan untuk login dengan Google
                  </p>
                </div>

                <div>
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nama Lengkap"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: UserRole) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="dosen">Dosen</SelectItem>
                      <SelectItem value="dekan">Dekan</SelectItem>
                      <SelectItem value="rektor">Rektor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nip">NIP (Opsional)</Label>
                  <Input
                    id="nip"
                    value={formData.nip}
                    onChange={(e) =>
                      setFormData({ ...formData, nip: e.target.value })
                    }
                    placeholder="NIP"
                  />
                </div>

                <div>
                  <Label htmlFor="jabatan">Jabatan (Opsional)</Label>
                  <Input
                    id="jabatan"
                    value={formData.jabatan}
                    onChange={(e) =>
                      setFormData({ ...formData, jabatan: e.target.value })
                    }
                    placeholder="Contoh: Ketua Program Studi Informatika"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada pengguna terdaftar
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className="capitalize">{user.role}</span>
                      </TableCell>
                      <TableCell>{user.nip || "-"}</TableCell>
                      <TableCell>{user.jabatan || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setUserToDelete(user)}
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pengguna</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email Google</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-name">Nama Lengkap</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="dosen">Dosen</SelectItem>
                    <SelectItem value="dekan">Dekan</SelectItem>
                    <SelectItem value="rektor">Rektor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-nip">NIP (Opsional)</Label>
                <Input
                  id="edit-nip"
                  value={formData.nip}
                  onChange={(e) =>
                    setFormData({ ...formData, nip: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-jabatan">Jabatan (Opsional)</Label>
                <Input
                  id="edit-jabatan"
                  value={formData.jabatan}
                  onChange={(e) =>
                    setFormData({ ...formData, jabatan: e.target.value })
                  }
                  placeholder="Contoh: Ketua Program Studi Informatika"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!userToDelete}
          onOpenChange={() => setUserToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus pengguna{" "}
                <strong>{userToDelete?.name}</strong>? Tindakan ini tidak dapat
                dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
