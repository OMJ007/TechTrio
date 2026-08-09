import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xpense AI — Personal Finance & Expense Intelligence",
  description:
    "Calm, precise, data-forward expense intelligence app powered by AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B0D12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark"
    >
      <body className="app-canvas min-h-screen font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
