import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlobalBackground from "@/components/layout/GlobalBackground";
import JsonLd from "@/components/seo/JsonLd";
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
  metadataBase: new URL("https://strikingcamp.com"),
  title: {
    default: "Striking Camp | Club de Boxe & Sports de Combat à Marseille (13010)",
    template: "%s | Striking Camp",
  },
  description: "Le club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking MMA et cours Lady 100% femmes. Coaching individuel et Small Group.",
  keywords: "club de boxe marseille, salle de boxe marseille 13010, kick boxing marseille, boxe thaï marseille, lady striking marseille, cours boxe femme marseille, meilleur coach boxe marseille, capelette 13010, mma striking marseille",
  authors: [{ name: "Striking Camp" }],
  creator: "Striking Camp",
  publisher: "Striking Camp",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Striking Camp | Club de Boxe & Sports de Combat à Marseille",
    description: "Le club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking et cours Lady 100% femmes.",
    url: "https://strikingcamp.com",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Striking Camp | Club de Boxe & Sports de Combat à Marseille",
    description: "Le club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking et cours Lady 100% femmes.",
  },
};

export const viewport: Viewport = {
  themeColor: "#020817",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${oswald.variable} antialiased scroll-smooth`}>
      <head>
        <JsonLd />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-[#020817] text-brand-white flex flex-col font-sans relative">
        <GlobalBackground />
        <Navbar />
        <main className="flex-grow relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
