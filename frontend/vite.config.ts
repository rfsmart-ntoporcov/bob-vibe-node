import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Bob keeps the frontend HMR WebSocket warm by pushing a heartbeat
// message every 15s. Without this, silent-idle stretches longer than
// CloudFront's 60s origin-idle timeout tear down the WS and trigger a
// full-page reload. See DECISIONS #046 in the Bob repo.
function bobHmrHeartbeat() {
  return {
    name: "bob-hmr-heartbeat",
    configureServer(server: {
      ws?: {
        send: (message: { type: string; event: string; data: unknown }) => void;
      };
    }) {
      const timer = setInterval(() => {
        server.ws?.send({
          type: "custom",
          event: "bob:heartbeat",
          data: { t: Date.now() },
        });
      }, 15_000);
      timer.unref?.();
    },
  };
}

// True when Vite is running inside a Bob MicroVM. Bob's hooks.ts
// writes `BOB_SESSION_ID` into the app process env — that's the
// canonical signal (checked in the base image's Dockerfile too).
// When this is set we open host-checking + rewire HMR to go through
// CloudFront; when it isn't we leave Vite's dev-server defaults
// alone so local dev feels normal.
const isBobSession = Boolean(process.env.BOB_SESSION_ID);

export default defineConfig(() => ({
  plugins: [
    tailwindcss(),
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    tsconfigPaths(),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    // Bob-only. No-op locally where the WS never hits CloudFront.
    ...(isBobSession ? [bobHmrHeartbeat()] : []),
  ],
  server: {
    port: 5173,
    // Bob's edge proxies via wildcard subdomains
    // (<sessionId>.lambda-microvm.us-east-1.on.aws etc.); vite's
    // default host-check rejects them ("Blocked request. This host
    // is not allowed"). Allow all when running inside Bob; local
    // dev is unaffected (localhost passes the default check).
    ...(isBobSession ? { host: true, allowedHosts: true as const } : {}),
    proxy: {
      "/api": {
        target: process.env.VITE_API_ORIGIN || "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
    // See DECISIONS #046 for the HMR heartbeat rationale.
    ...(isBobSession
      ? {
          hmr: {
            clientPort: 443,
            protocol: "wss" as const,
          },
        }
      : {}),
  },
}));
