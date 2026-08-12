import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Striking Camp Marseille | Kickboxing & Muay Thai",
  description: "Club de kick-boxing et Muay Thai à Marseille par Mohamed Mahfoud. Un entraînement exigeant, une méthode précise, une culture du combat.",
  keywords: ["kickboxing Marseille", "kick boxing Marseille", "kick-boxing Marseille", "Muay Thai Marseille", "boxe thaï Marseille", "club kickboxing Marseille", "coach kickboxing Marseille", "striking Marseille", "MMA Marseille"],
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${oswald.variable} antialiased scroll-smooth`}>
      <body className="min-h-screen bg-brand-black text-brand-white flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
