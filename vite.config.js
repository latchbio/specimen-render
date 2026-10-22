import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        display: resolve(import.meta.dirname, "display.html"),
        "detail-lab": resolve(import.meta.dirname, "detail-lab.html"),
        "image-relief": resolve(import.meta.dirname, "image-relief.html"),
        face: resolve(import.meta.dirname, "face.html"),
        "flower-dither": resolve(import.meta.dirname, "flower-dither.html"),
      },
    },
  },
});
