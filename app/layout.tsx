import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/bodoni-moda/600.css";
import "@fontsource/bodoni-moda/700.css";
import "@fontsource/pinyon-script/400.css";
import "./globals.css";

// Link previews need absolute image URLs; Vercel provides the production domain.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Marnie & Zach · 23 January 2027",
  description: "You’re invited to the wedding of Marnie & Zach. Tap to view details and RSVP.",
  openGraph: {
    title: "Marnie & Zach’s Wedding",
    description: "Saturday 23 January 2027 · Gold Coast. Tap to view details and RSVP.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Marnie & Zach · 23 January 2027" }],
  },
  twitter: { card: "summary_large_image" },
  // A private invitation: keep it out of search results.
  robots: { index: false, follow: false },
  // Stops phones turning dates and addresses into blue links.
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = { themeColor: "#fffefc", width: "device-width", initialScale: 1, colorScheme: "only light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
