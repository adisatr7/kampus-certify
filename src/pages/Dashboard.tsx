import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Shield, 
  FileText, 
  Award, 
  Users, 
  Activity,
  TrendingUp,
  Clock,
  AlertCircle
} from "lucide-react";

interface DashboardProps {
  userRole: 'admin' | 'dosen' | 'rektor' | 'dekan';
}

export default function Dashboard({ userRole = 'admin' }: DashboardProps) {
  // Mock data berdasarkan role
  const getDashboardData = () => {
    if (userRole === 'admin') {
      return {
        title: "Dashboard Administrator",
        description: "Kelola seluruh sistem Certificate Authority UMC",
        stats: [
          {
            title: "Total Sertifikat",
            value: "156",
            description: "Aktif: 142, Revoked: 14",
            icon: Award,
            trend: "+12%"
          },
          {
            title: "Dokumen Ditandatangani",
            value: "1,247",
            description: "Bulan ini: 89 dokumen",
            icon: FileText,
            trend: "+8%"
          },
          {
            title: "Pengguna Terdaftar",
            value: "67",
            description: "Admin: 3, Staff: 64",
            icon: Users,
            trend: "+2"
          },
          {
            title: "Verifikasi Hari Ini",
            value: "34",
            description: "Valid: 32, Invalid: 2",
            icon: Activity,
            trend: "+15%"
          }
        ]
      };
    } else {
      return {
        title: `Dashboard ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`,
        description: "Kelola dokumen dan sertifikat digital Anda",
        stats: [
          {
            title: "Sertifikat Aktif",
            value: "2",
            description: "Berlaku hingga 2025",
            icon: Award,
            trend: "Aktif"
          },
          {
            title: "Dokumen Saya",
            value: "23",
            description: "Ditandatangani: 18",
            icon: FileText,
            trend: "+3 baru"
          },
          {
            title: "Verifikasi Bulan Ini",
            value: "12",
            description: "Berhasil diverifikasi",
            icon: Activity,
            trend: "100%"
          }
        ]
      };
    }
  };

  const dashboardData = getDashboardData();

  const recentActivities = [
    {
      type: "certificate",
      title: "Sertifikat baru diterbitkan",
      description: "Sertifikat untuk Dr. Ahmad Zain",
      time: "2 jam yang lalu",
      status: "valid" as const
    },
    {
      type: "document", 
      title: "Dokumen ditandatangani",
      description: "SK Pengangkatan Dosen.pdf",
      time: "4 jam yang lalu", 
      status: "valid" as const
    },
    {
      type: "verification",
      title: "Verifikasi dokumen",
      description: "Surat Keputusan Rektor.pdf",
      time: "1 hari yang lalu",
      status: "valid" as const
    },
    {
      type: "revoke",
      title: "Sertifikat dicabut",
      description: "Sertifikat kedaluwarsa",
      time: "2 hari yang lalu",
      status: "revoked" as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{dashboardData.title}</h1>
          <p className="text-muted-foreground">{dashboardData.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardData.stats.map((stat, index) => (
          <Card key={index} className="fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>
              Riwayat aktivitas sistem dalam 7 hari terakhir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0">
                  {activity.type === 'certificate' && <Award className="h-5 w-5 text-primary" />}
                  {activity.type === 'document' && <FileText className="h-5 w-5 text-blue-600" />}
                  {activity.type === 'verification' && <Activity className="h-5 w-5 text-green-600" />}
                  {activity.type === 'revoke' && <AlertCircle className="h-5 w-5 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                    <StatusBadge status={activity.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>
              Fitur yang sering digunakan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userRole === 'admin' ? (
              <>
                <button className="w-full text-left p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                  <div className="font-medium text-primary">Terbitkan Sertifikat</div>
                  <div className="text-xs text-muted-foreground">Buat sertifikat baru</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="font-medium text-blue-700">Kelola Pengguna</div>
                  <div className="text-xs text-muted-foreground">Tambah atau edit pengguna</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="font-medium text-green-700">Verifikasi Dokumen</div>
                  <div className="text-xs text-muted-foreground">Periksa keaslian dokumen</div>
                </button>
              </>
            ) : (
              <>
                <button className="w-full text-left p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                  <div className="font-medium text-primary">Upload Dokumen</div>
                  <div className="text-xs text-muted-foreground">Tambah dokumen baru</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="font-medium text-blue-700">Tanda Tangani</div>
                  <div className="text-xs text-muted-foreground">Tanda tangani dokumen</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="font-medium text-green-700">Verifikasi</div>
                  <div className="text-xs text-muted-foreground">Periksa dokumen</div>
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}