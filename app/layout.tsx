import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlobalBackground from "@/components/layout/GlobalBackground";
import JsonLd from "@/components/seo/JsonLd";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
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
  metadataBase: new URL("https://www.strikingcamp.com"),
  title: {
    default: "Striking Camp | Club de Boxe & Sports de Combat à Marseille (13010)",
    template: "%s | Striking Camp",
  },
  description: "Le club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking et cours Lady 100% femmes. Coaching individuel et Small Group.",
  keywords: "club de boxe marseille, salle de boxe marseille 13010, kick boxing marseille, boxe thaï marseille, lady striking marseille, cours boxe femme marseille, coach boxe marseille, capelette 13010, striking marseille",
  authors: [{ name: "Striking Camp" }],
  creator: "Striking Camp",
  publisher: "Striking Camp",
  alternates: {
    canonical: "https://www.strikingcamp.com",
  },
  openGraph: {
    title: "Striking Camp | Club de Boxe & Sports de Combat à Marseille",
    description: "Le club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking et cours Lady 100% femmes.",
    url: "https://www.strikingcamp.com",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/sacSalle.jpg",
        width: 1200,
        height: 630,
        alt: "Salle de Boxe et Sports de Combat Striking Camp Marseille 13010",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Striking Camp | Club de Boxe & Sports de Combat à Marseille",
    description: "Le club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking et cours Lady 100% femmes.",
    images: ["/sacSalle.jpg"],
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-blue focus:text-brand-black focus:font-heading focus:font-bold focus:rounded-sm focus:shadow-xl focus:outline-none"
        >
          Aller au contenu principal
        </a>
        <GlobalBackground />
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-grow relative z-10 outline-none">
          {children}
        </main>
        <Footer />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
