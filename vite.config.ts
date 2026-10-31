import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "pocketpal-existing-pwa",
      generateBundle(_options, bundle) {
        const files = Object.keys(bundle).filter((name) =>
          /\.(js|css|html)$/.test(name),
        );
        const version = createHash("sha256")
          .update(
            files
              .map(
                (name) =>
                  name +
                  (bundle[name].type === "asset"
                    ? String(bundle[name].source)
                    : bundle[name].code),
              )
              .join(""),
          )
          .update(readFileSync("index.html"))
          .update(readFileSync("src/sw.template.js"))
          .update(readFileSync("public/manifest.webmanifest"))
          .update(readFileSync("public/icon-512.png"))
          .digest("hex")
          .slice(0, 16);
        const assets = [
          ...new Set(["./index.html", ...files.map((name) => `./${name}`)]),
          "./manifest.webmanifest",
          "./icon-192.png",
          "./icon-512.png",
          "./apple-touch-icon.png",
        ];
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: readFileSync("src/sw.template.js", "utf8")
            .replace("__BUILD__", version)
            .replace("__ASSETS__", JSON.stringify(assets)),
        });
      },
    },
  ],
});
