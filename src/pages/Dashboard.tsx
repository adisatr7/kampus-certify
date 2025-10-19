import {
  Activity,
  AlertCircle,
  Award,
  BarChart3,
  Calendar,
  Clock,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDashboardStats, useRecentActivities, useRecentDocuments } from "@/hooks/dashboard";
import { DocumentStatus } from "../types";

interface DashboardProps {
  userRole: "admin" | "dosen" | "rektor" | "dekan";
}

export default function Dashboard({ userRole = "admin" }: DashboardProps) {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats(userRole);

  // Only fetch activities for admin users
  const {
    data: activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useRecentActivities(userRole);

  // Only fetch recent documents for non-admin users
  const { data: recentDocuments, isLoading: documentsLoading } = useRecentDocuments(userRole);

  const navigate = useNavigate();

  const handleNewDocument = () => {
    if (userRole === "admin") {
      navigate("admin/documents");
    } else {
      navigate("/documents");
    }
  };

  const handleSignDocument = () => {
    if (userRole === "admin") {
      return;
    }
    navigate("/sign");
  };

  const handleVerifyDocument = () => {
    navigate("/verify");
  };

  // Dashboard configuration based on role
  const getDashboardConfig = () => {
    if (userRole === "admin") {
      return {
        title: "Dashboard Administrator",
        description: "Kelola seluruh sistem Certificate Authority UMC",
        getStatsCards: (stats) => [
          {
            title: "Dokumen Ditandatangani",
            value: stats?.signedDocuments?.toString() || "0",
            description: `Total: ${stats?.totalDocuments || 0} dokumen`,
            icon: FileText,
            trend: `+${Math.round((stats?.signedDocuments / Math.max(stats?.totalDocuments, 1)) * 100) || 0}%`,
            trendColor: "text-emerald-600",
            bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
            iconColor: "text-blue-600",
          },
          {
            title: "Pengguna Terdaftar",
            value: stats?.totalUsers?.toString() || "0",
            description: `Admin: ${stats?.adminUsers || 0}, Staff: ${stats?.staffUsers || 0}`,
            icon: Users,
            trend: `+${stats?.staffUsers || 0}`,
            trendColor: "text-blue-600",
            bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100",
            iconColor: "text-indigo-600",
          },
          {
            title: "Verifikasi Hari Ini",
            value: stats?.todayVerifications?.toString() || "0",
            description: `Valid: ${stats?.validVerifications || 0}, Invalid: ${stats?.invalidVerifications || 0}`,
            icon: Activity,
            trend: `${Math.round((stats?.validVerifications / Math.max(stats?.todayVerifications, 1)) * 100) || 0}%`,
            trendColor:
              stats?.validVerifications > stats?.invalidVerifications
                ? "text-emerald-600"
                : "text-amber-600",
            bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100",
            iconColor: "text-emerald-600",
          },
        ],
      };
    } else {
      return {
        title: `Dashboard ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`,
        description: "Kelola dokumen dan sertifikat digital Anda",
        getStatsCards: (stats) => [
          {
            title: "Sertifikat Aktif",
            value: stats?.activeCertificates?.toString() || "0",
            description: "Berlaku hingga 2025",
            icon: Award,
            trend: stats?.activeCertificates > 0 ? "Aktif" : "Tidak Ada",
            trendColor: stats?.activeCertificates > 0 ? "text-emerald-600" : "text-gray-500",
            bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
            iconColor: "text-purple-600",
          },
          {
            title: "Dokumen Saya",
            value: stats?.totalDocuments?.toString() || "0",
            description: `Ditandatangani: ${stats?.signedDocuments || 0}`,
            icon: FileText,
            trend: `+${stats?.pendingDocuments || 0} pending`,
            trendColor: "text-blue-600",
            bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
            iconColor: "text-blue-600",
          },
          {
            title: "Verifikasi Bulan Ini",
            value: stats?.todayVerifications?.toString() || "0",
            description: "Berhasil diverifikasi",
            icon: Activity,
            trend: "100%",
            trendColor: "text-emerald-600",
            bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100",
            iconColor: "text-emerald-600",
          },
        ],
      };
    }
  };

  const dashboardConfig = getDashboardConfig();

  // Show loading state
  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin mx-auto"
                style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
              ></div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Memuat Dashboard</h3>
              <p className="text-slate-500">Sedang mengambil data terbaru...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (statsError || (userRole === "admin" && activitiesError)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="max-w-md w-full">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-red-100">
              <div className="text-center">
                <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h3>
                <p className="text-slate-600 mb-6">
                  Gagal memuat data dashboard. Silakan refresh halaman atau hubungi administrator.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Refresh Halaman
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statsCards = dashboardConfig.getStatsCards(stats);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      <div className="space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {dashboardConfig.title}
            </h1>
            <p className="text-slate-600 text-sm sm:text-lg">{dashboardConfig.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="sm:hidden">
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              style={{
                animationDelay: `${index * 100}ms`,
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
              }}
            >
              <div className={`absolute inset-0 opacity-30 ${stat.bgColor}`} />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</div>
                <p className="text-sm text-slate-600 mb-3">{stat.description}</p>
                <div className="flex items-center gap-1">
                  <div
                    className={`p-1 rounded-full ${stat.trendColor === "text-emerald-600" ? "bg-emerald-100" : stat.trendColor === "text-blue-600" ? "bg-blue-100" : "bg-amber-100"}`}
                  >
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className={`text-sm font-medium ${stat.trendColor}`}>{stat.trend}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        {userRole === "admin" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Activities - Admin Only */}
            <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Aktivitas Terbaru
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Riwayat aktivitas sistem dalam 7 hari terakhir
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
                    <span className="text-slate-600">Memuat aktivitas...</span>
                  </div>
                ) : activities && activities.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {activities.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-blue-50 hover:to-indigo-50/50 transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`p-3 rounded-full ${
                              activity.type === "document"
                                ? "bg-blue-100"
                                : activity.type === "verification"
                                  ? "bg-emerald-100"
                                  : "bg-red-100"
                            }`}
                          >
                            {activity.type === "document" && (
                              <FileText className="h-5 w-5 text-blue-600" />
                            )}
                            {activity.type === "verification" && (
                              <Activity className="h-5 w-5 text-emerald-600" />
                            )}
                            {activity.type === "revoke" && (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                              {activity.title}
                            </h4>
                            <StatusBadge status={activity.status as DocumentStatus} />
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{activity.description}</p>
                          {activity.user_name && (
                            <p className="text-xs text-slate-500 mb-2">
                              oleh <span className="font-medium">{activity.user_name}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{activity.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-12">
                    <div className="p-4 rounded-full bg-slate-100 w-fit mx-auto mb-4">
                      <Activity className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">Belum ada aktivitas terbaru</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Aktivitas sistem akan muncul di sini
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Quick Actions */}
            <Card
              className="border-0 shadow-lg bg-white/80 backdrop-blur-sm"
              onClick={handleNewDocument}
            >
              <CardHeader className="border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">Aksi Cepat</CardTitle>
                    <CardDescription className="text-slate-600">
                      Fitur yang sering digunakan
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <button className="w-full group text-left p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-300 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-blue-700">Kelola Dokumen</div>
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-600 mt-1">Tambah atau edit dokumen</div>
                </button>
                <button className="w-full group text-left p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 transition-all duration-300 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-emerald-700">Verifikasi Dokumen</div>
                    <Activity className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-sm text-emerald-600 mt-1">Periksa keaslian dokumen</div>
                </button>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Non-Admin Layout
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick Actions - Enhanced for Non-Admin */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">Aksi Cepat</CardTitle>
                    <CardDescription className="text-slate-600">
                      Fitur utama untuk mengelola dokumen Anda
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <button
                  onClick={handleNewDocument}
                  className="w-full group relative overflow-hidden text-left p-5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-lg">Upload Dokumen</div>
                      <FileText className="h-6 w-6 opacity-80" />
                    </div>
                    <div className="text-sm opacity-90 mt-2">Tambah dokumen baru ke sistem</div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </button>

                <button
                  onClick={handleSignDocument}
                  className="w-full group text-left p-5 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-300 border border-blue-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-lg text-blue-700">Tanda Tangani</div>
                    <Award className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-600 mt-2">Tanda tangani dokumen digital</div>
                </button>

                <button
                  onClick={handleVerifyDocument}
                  className="w-full group text-left p-5 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 transition-all duration-300 border border-emerald-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-lg text-emerald-700">Verifikasi</div>
                    <Activity className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="text-sm text-emerald-600 mt-2">Periksa keaslian dokumen</div>
                </button>
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Dokumen Terbaru
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Dokumen yang baru saja Anda kelola
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {documentsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
                    <span className="text-slate-600">Memuat dokumen...</span>
                  </div>
                ) : recentDocuments && recentDocuments.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {recentDocuments.map((doc, index) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-purple-50 hover:to-purple-100/50 transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`p-3 rounded-full ${
                              doc.status === "signed"
                                ? "bg-emerald-100"
                                : doc.status === "pending"
                                  ? "bg-blue-100"
                                  : "bg-red-100"
                            }`}
                          >
                            {doc.status === "signed" && (
                              <Award className="h-5 w-5 text-emerald-600" />
                            )}
                            {doc.status === "pending" && (
                              <FileText className="h-5 w-5 text-blue-600" />
                            )}
                            {doc.status === "revoked" && (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                            {doc.title}
                          </h4>
                          <p className="text-sm text-slate-600 mb-2">
                            {doc.status === "signed"
                              ? "Dokumen telah ditandatangani"
                              : doc.status === "pending"
                                ? "Menunggu tanda tangan"
                                : "Dokumen dicabut"}
                          </p>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-500">
                              {doc.status === "signed" && doc.updated_at
                                ? `Ditandatangani ${new Date(doc.updated_at).toLocaleDateString("id-ID")}`
                                : `Dibuat ${new Date(doc.created_at).toLocaleDateString("id-ID")}`}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={doc.status as DocumentStatus} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-12">
                    <div className="p-4 rounded-full bg-slate-100 w-fit mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">Belum ada dokumen</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Mulai dengan mengupload dokumen pertama Anda
                    </p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-200">
                  <button className="w-full text-center py-3 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    Lihat Semua Dokumen →
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
