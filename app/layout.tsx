import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "T3 Coffee", template: "%s | T3 Coffee" },
  icons: { apple: "/apple-touch-icon.png" },
  description: "Order coffee at your table with the Team T3 Robot Coffee Cup demo.",
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
