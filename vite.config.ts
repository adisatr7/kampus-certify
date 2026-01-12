import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/functions': {
        target: 'https://zupygwgwsrcwhkwhuwtk.supabase.co',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  // Use root path for both development and production (Vercel deployment)
  // Note: If deploying to GitHub Pages with subpath, change this to "/kampus-certify/"
  base: "/",
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
