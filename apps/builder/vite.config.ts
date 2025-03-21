import { resolve } from "node:path";
import { defineConfig, type CorsOptions } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import { vercelPreset } from "@vercel/remix/vite";
import type { IncomingMessage } from "node:http";
import pc from "picocolors";

import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
} from "./app/shared/router-utils/origins";
import { readFileSync } from "node:fs";

export default defineConfig(({ mode }) => {
  if (mode === "test") {
    return {
      resolve: {
        conditions: ["webstudio"],
        alias: [
          {
            find: "~",
            replacement: resolve("app"),
          },
        ],
      },
    };
  }

  if (mode === "development") {
    // Désactivation des rejets TLS (utile en dev pour certains fetch sécurisés)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  return {
    plugins: [
      remix({
        presets: [vercelPreset()],
        future: {
          v3_lazyRouteDiscovery: false,
          v3_relativeSplatPath: false,
          v3_singleFetch: false,
          v3_fetcherPersist: false,
          v3_throwAbortReason: false,
        },
      }),
      {
        name: "request-timing-logger",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const start = Date.now();
            res.on("finish", () => {
              const duration = Date.now() - start;
              if (
                !(
                  req.url?.startsWith("/@") ||
                  req.url?.startsWith("/app") ||
                  req.url?.includes("/node_modules")
                )
              ) {
                console.info(
                  `[${req.method}] ${req.url} - ${duration}ms : ${pc.dim(req.headers.host)}`
                );
              }
            });
            next();
          });
        },
      },
    ],
    resolve: {
      conditions: ["webstudio"],
      alias: [
        {
          find: "~",
          replacement: resolve("app"),
        },
        {
          find: "@supabase/node-fetch",
          replacement: resolve("./app/shared/empty.ts"),
        },
      ],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    server: {
      // Écoute sur toutes les interfaces pour être accessible de l'extérieur
      host: "0.0.0.0",
      // Désactivation complète de HTTPS pour utiliser HTTP
      https: false,
      // Conservez le proxy si nécessaire ou supprimez-le
      proxy: {},
      cors: ((req: IncomingMessage, callback: (error: Error | null, options: CorsOptions | null) => void) => {
        if (req.method === "OPTIONS" || req.method === "POST") {
          if (req.headers.origin != null && req.url != null) {
            const url = new URL(req.url, `https://${req.headers.host}`);
            if (url.pathname === "/builder-logout" && isBuilderUrl(url.href)) {
              return callback(null, {
                origin: getAuthorizationServerOrigin(url.href),
                preflightContinue: false,
                credentials: true,
              });
            }
          }
          if (req.method === "OPTIONS") {
            return callback(null, {
              preflightContinue: false,
              optionsSuccessStatus: 405,
            });
          }
        }
        return callback(null, {
          origin: false,
        });
      }) as never,
    },
    envPrefix: "GITHUB_",
  };
});
