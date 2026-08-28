import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Osonflow — AI customer support",
    short_name: "Osonflow",
    description:
      "AI answers your customers on chat and voice from your own content, and hands the conversation to your team the moment a person is needed.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3a04ff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
