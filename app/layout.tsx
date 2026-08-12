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
  title: 'Striking Camp | Le Meilleur Club de Boxe & Pieds-Poings à Marseille',
  description: "Le club de référence à Marseille pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, et cours Lady Striking 100% femmes. Rejoignez l'excellence avec le meilleur coach individuel de la cité phocéenne.",
  keywords: "club de boxe marseille, pieds poings marseille, kick boxing marseille, boxe thaï marseille, lady boxing, lady striking, meilleur coach boxe marseille, sport de combat 13010, salle de sport marseille, mma striking",
  authors: [{ name: "Striking Camp" }],
  openGraph: {
    title: 'Striking Camp | Boxe & Pieds-Poings à Marseille',
    description: "Le club de référence à Marseille pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï. Cours professionnels et section Lady 100% femmes.",
    url: 'https://strikingcamp.com',
    siteName: 'Striking Camp',
    locale: 'fr_FR',
    type: 'website',
  },
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
      <body suppressHydrationWarning className="min-h-screen bg-brand-black text-brand-white flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
