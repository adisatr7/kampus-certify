import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import VerificationPortal from "./pages/VerificationPortal";
import PublicDocumentVerification from "./pages/PublicDocumentVerification";
import NotFound from "./pages/NotFound";
import CertificateManagement from "./pages/admin/CertificateManagement";
import DocumentManagement from "./pages/admin/DocumentManagement";
import AuditTrail from "./pages/admin/AuditTrail";
import MyDocuments from "./pages/user/MyDocuments";
import DocumentSigning from "./pages/user/DocumentSigning";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/verify" element={<VerificationPortal />} />
            <Route path="/verification-portal" element={<VerificationPortal />} />
            <Route path="/document-verification" element={<PublicDocumentVerification />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/certificates" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CertificateManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/documents" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DocumentManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/audit" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditTrail />
                </ProtectedRoute>
              } 
            />
            
            {/* User Routes */}
            <Route 
              path="/documents" 
              element={
                <ProtectedRoute allowedRoles={['dosen', 'rektor', 'dekan']}>
                  <MyDocuments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sign" 
              element={
                <ProtectedRoute allowedRoles={['dosen', 'rektor', 'dekan']}>
                  <DocumentSigning />
                </ProtectedRoute>
              } 
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;