import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/Sonner";
import { Toaster } from "@/components/ui/Toaster";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { AuthProvider } from "@/lib/auth";
import AuditTrail from "./pages/admin/AuditTrail";
import CertificateManagement from "./pages/admin/CertificateManagement";
import CreateIjazah from "./pages/admin/CreateIjazah";
import CreateSertifikat from "./pages/admin/CreateSertifikat";
import DocumentManagement from "./pages/admin/DocumentManagement";
import TemplateManagement from "./pages/admin/TemplateManagement";
import UserManagement from "./pages/admin/UserManagement";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import QrScanner from "./pages/QrScanner";
import DocumentSigning from "./pages/user/DocumentSigning";
import MyDocuments from "./pages/user/MyDocuments";
import VerificationPortal from "./pages/VerificationPortal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
    >
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/"
                element={<Index />}
              />
              <Route
                path="/verify"
                element={<VerificationPortal />}
              />
              <Route
                path="/verification-portal"
                element={<VerificationPortal />}
              />
              <Route
                path="/qr-scanner"
                element={<QrScanner />}
              />
              {/* <Route
                path="/document-verification"
                element={<PublicDocumentVerification />}
              /> */}

              {/* Admin Routes */}
              <Route
                path="/admin/certificates"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CertificateManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/documents"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <DocumentManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/create-ijazah"
                element={
                  <ProtectedRoute allowedRoles={["admin", "rektor", "dekan"]}>
                    <CreateIjazah />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/create-sertifikat"
                element={
                  <ProtectedRoute allowedRoles={["admin", "dosen", "rektor", "dekan"]}>
                    <CreateSertifikat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/templates"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <TemplateManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/sign"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <DocumentSigning />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AuditTrail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              {/* User Routes */}
              <Route
                path="/documents"
                element={
                  <ProtectedRoute allowedRoles={["dosen", "rektor", "dekan"]}>
                    <MyDocuments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-ijazah"
                element={
                  <ProtectedRoute allowedRoles={["rektor"]}>
                    <CreateIjazah />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-sertifikat"
                element={
                  <ProtectedRoute allowedRoles={["dosen", "rektor", "dekan"]}>
                    <CreateSertifikat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sign"
                element={
                  <ProtectedRoute allowedRoles={["dosen", "rektor", "dekan"]}>
                    <DocumentSigning />
                  </ProtectedRoute>
                }
              />

              <Route
                path="*"
                element={<NotFound />}
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
