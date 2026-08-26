import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    root: "native-app",
    base: "./",
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(process.cwd()),
      },
    },
    define: {
      "process.env": {},
      __KAIFY_API_BASE__: JSON.stringify(
        env.NATIVE_API_BASE_URL || "https://kaifyai.org",
      ),
      __SUPABASE_URL__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ""),
      __SUPABASE_ANON_KEY__: JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      ),
    },
    build: {
      outDir: "../native-dist",
      emptyOutDir: true,
      sourcemap: true,
      target: "es2022",
    },
  };
});
