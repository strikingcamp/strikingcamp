import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatBySlug, getAllFormatSlugs } from "@/data/formats";
import FormatDetailView from "@/components/sections/FormatDetailView";

interface FormatPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllFormatSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: FormatPageProps): Promise<Metadata> {
  const { slug } = await params;
  const format = getFormatBySlug(slug);

  if (!format) {
    return {
      title: "Cours non trouvé | Striking Camp",
    };
  }

  const canonicalUrl = `https://strikingcamp.com/cours/${format.slug}`;

  return {
    title: format.metaTitle,
    description: format.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: format.metaTitle,
      description: format.metaDescription,
      url: canonicalUrl,
      siteName: "Striking Camp",
      locale: "fr_FR",
      type: "website",
      images: [
        {
          url: format.image,
          width: 1200,
          height: 630,
          alt: format.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: format.metaTitle,
      description: format.metaDescription,
      images: [format.image],
    },
  };
}

export default async function FormatPage({ params }: FormatPageProps) {
  const { slug } = await params;
  const format = getFormatBySlug(slug);

  if (!format) {
    notFound();
  }

  // Schema.org Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${format.title} — Striking Camp Marseille`,
    description: format.metaDescription,
    provider: {
      "@type": "SportsActivityLocation",
      name: "Striking Camp",
      image: "https://strikingcamp.com/icon.png",
      address: {
        "@type": "PostalAddress",
        streetAddress: "268 avenue de la Capelette",
        addressLocality: "Marseille",
        postalCode: "13010",
        addressCountry: "FR",
      },
      telephone: "06.14.95.88.49",
      url: "https://strikingcamp.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FormatDetailView format={format} />
    </>
  );
}
