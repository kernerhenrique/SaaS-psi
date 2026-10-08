import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Consultório",
    short_name: "Consultório",
    description: "Agenda, prontuário e financeiro para psicólogas.",
    start_url: "/admin",
    display: "standalone",
    background_color: "#f6f2ec",
    theme_color: "#f6f2ec",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
