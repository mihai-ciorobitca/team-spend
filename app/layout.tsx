import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: {
      default: "TeamSpend",
      template: "%s · TeamSpend",
    },
    description: "A fast, mobile-first spending tracker for your whole team.",
    openGraph: {
      title: "TeamSpend",
      description: "Team spending, sorted.",
      type: "website",
      images: [{ url: "/og.png", width: 1744, height: 912, alt: "TeamSpend — Team spending, sorted." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "TeamSpend",
      description: "Team spending, sorted.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
