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

  const canonicalUrl = `https://www.strikingcamp.com/disciplines/${discipline.slug}`;

  return {
    title: discipline.metaTitle,
    description: discipline.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${discipline.metaTitle} | Striking Camp`,
      description: discipline.metaDescription,
      url: canonicalUrl,
      siteName: "Striking Camp",
      locale: "fr_FR",
      type: "website",
      images: [
        {
          url: `https://www.strikingcamp.com${discipline.image}`,
          width: 1200,
          height: 630,
          alt: discipline.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${discipline.metaTitle} | Striking Camp`,
      description: discipline.metaDescription,
      images: [`https://www.strikingcamp.com${discipline.image}`],
    },
  };
}

export default async function DisciplinePage({ params }: DisciplinePageProps) {
  const { slug } = await params;
  const discipline = getDisciplineBySlug(slug);

  if (!discipline) {
    notFound();
  }

  // Schema.org Structured Data : Course & BreadcrumbList
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${discipline.title} — Striking Camp Marseille`,
    description: discipline.metaDescription,
    provider: {
      "@type": "SportsActivityLocation",
      name: "Striking Camp",
      image: "https://www.strikingcamp.com/icon.png",
      address: {
        "@type": "PostalAddress",
        streetAddress: "268 avenue de la Capelette",
        addressLocality: "Marseille",
        postalCode: "13010",
        addressCountry: "FR",
      },
      telephone: "06.14.95.88.49",
      url: "https://www.strikingcamp.com",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://www.strikingcamp.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Disciplines",
        item: "https://www.strikingcamp.com/#disciplines",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: discipline.title,
        item: `https://www.strikingcamp.com/disciplines/${discipline.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DisciplineDetailView discipline={discipline} />
    </>
  );
}
