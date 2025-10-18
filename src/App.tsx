import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/Sonner";
import { Toaster } from "@/components/ui/Toaster";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { AuthProvider } from "@/lib/auth";
import AuditTrail from "./pages/admin/AuditTrail";
import DocumentManagement from "./pages/admin/DocumentManagement";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PublicDocumentVerification from "./pages/PublicDocumentVerification";
import DocumentSigning from "./pages/user/DocumentSigning";
import MyDocuments from "./pages/user/MyDocuments";
import VerificationPortal from "./pages/VerificationPortal";

const queryClient = new QueryClient();

const App = () => {
  // Use HashRouter when the app is served under a subpath (GH Pages),
  // because BrowserRouter requires server-side routing for refreshes.
  const useHashRouter = import.meta.env.PROD && import.meta.env.BASE_URL !== "/";
  const Router = useHashRouter ? HashRouter : BrowserRouter;

  return (
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
            <Router basename={import.meta.env.BASE_URL}>
              <Routes>
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
                  path="/document-verification"
                  element={<PublicDocumentVerification />}
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/documents"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <DocumentManagement />
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
                  path="/sign"
                  element={
                    <ProtectedRoute allowedRoles={["dosen", "rektor", "dekan"]}>
                      <DocumentSigning />
                    </ProtectedRoute>
                  }
                />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route
                  path="*"
                  element={<NotFound />}
                />
              </Routes>
            </Router>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
