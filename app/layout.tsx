import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/bodoni-moda/600.css";
import "@fontsource/bodoni-moda/700.css";
import "@fontsource/pinyon-script/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marnie & Zach · 23 January 2027",
  description: "You’re invited to the wedding of Marnie & Zach. Tap to view details and RSVP.",
  openGraph: {
    title: "Marnie & Zach’s Wedding",
    description: "Saturday 23 January 2027 · Gold Coast. Tap to view details and RSVP.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = { themeColor: "#fffefc", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
