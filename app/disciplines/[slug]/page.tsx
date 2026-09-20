import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDisciplineBySlug, getAllDisciplineSlugs } from "@/data/disciplines";
import DisciplineDetailView from "@/components/sections/DisciplineDetailView";

interface DisciplinePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllDisciplineSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: DisciplinePageProps): Promise<Metadata> {
  const { slug } = await params;
  const discipline = getDisciplineBySlug(slug);

  if (!discipline) {
    return {
      title: "Discipline non trouvée | Striking Camp",
    };
  }

  const canonicalUrl = `https://strikingcamp.com/disciplines/${discipline.slug}`;

  return {
    title: discipline.metaTitle,
    description: discipline.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: discipline.metaTitle,
      description: discipline.metaDescription,
      url: canonicalUrl,
      siteName: "Striking Camp",
      locale: "fr_FR",
      type: "website",
      images: [
        {
          url: discipline.image,
          width: 1200,
          height: 630,
          alt: discipline.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: discipline.metaTitle,
      description: discipline.metaDescription,
      images: [discipline.image],
    },
  };
}

export default async function DisciplinePage({ params }: DisciplinePageProps) {
  const { slug } = await params;
  const discipline = getDisciplineBySlug(slug);

  if (!discipline) {
    notFound();
  }

  // Schema.org Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${discipline.title} — Striking Camp Marseille`,
    description: discipline.metaDescription,
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
      <DisciplineDetailView discipline={discipline} />
    </>
  );
}
