import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peptiking Spending",
    short_name: "Peptiking",
    description: "Capture team spending and receipt proof, even while offline.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f5f9",
    theme_color: "#102a56",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
