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
      default: "Peptiking",
      template: "%s · Peptiking",
    },
    description: "A fast, mobile-first spending tracker for your whole team.",
    openGraph: {
      title: "Peptiking",
      description: "Team spending, sorted.",
      type: "website",
      images: [{ url: "/og.png", width: 1731, height: 909, alt: "Peptiking — Team spending, sorted." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Peptiking",
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
