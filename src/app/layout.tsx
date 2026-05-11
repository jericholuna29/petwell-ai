import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

export const metadata: Metadata = {
  title: "Petwell AI - Professional Pet Care",
  description: "Connect with veterinarians and get AI-powered pet health insights",
  icons: {
    icon: "/Petwellai.svg",
    shortcut: "/Petwellai.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col pb-20 md:pb-0">
        <Toaster position="top-right" />
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
