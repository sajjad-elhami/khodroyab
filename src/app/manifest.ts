import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "خودرویاب",
    short_name: "خودرویاب",
    description: "مدیریت هوشمند خودرو",
    start_url: "/vehicles",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#ffffff",
    orientation: "portrait",
    lang: "fa",
    dir: "rtl",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
