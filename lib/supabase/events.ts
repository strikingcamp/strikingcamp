import { SupabaseClient } from "@supabase/supabase-js";
import { clubEvents, type ClubEvent, type EventCategory, type EventStatus } from "@/data/events";

export type { ClubEvent, EventCategory, EventStatus };

export interface DbEventRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  category_label: string;
  status: string;
  is_featured: boolean;
  date_display?: string | null;
  time_display?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  coach?: string | null;
  price?: string | null;
  spots?: string | null;
  description?: string | null;
  highlights?: string[] | null;
  registration_url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Mappe une ligne brute PostgreSQL vers l'interface ClubEvent
 */
export function mapDbEventToClubEvent(row: DbEventRow): ClubEvent {
  // Déduire date et heure lisibles si starts_at est renseigné et pas date_display
  let displayDate = row.date_display || "";
  let displayTime = row.time_display || "";

  if (!displayDate && row.starts_at) {
    try {
      const d = new Date(row.starts_at);
      displayDate = d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      // Mettre la première lettre en majuscule
      displayDate = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);
    } catch {
      displayDate = row.starts_at;
    }
  }

  if (!displayTime && row.starts_at) {
    try {
      const d = new Date(row.starts_at);
      const startH = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      if (row.ends_at) {
        const endD = new Date(row.ends_at);
        const endH = endD.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        displayTime = `${startH} – ${endH}`;
      } else {
        displayTime = startH;
      }
    } catch {
      displayTime = "";
    }
  }

  // Normalisation du statut
  let mappedStatus: EventStatus = "published";
  const rawStatus = (row.status || "").toLowerCase();
  if (rawStatus === "draft") mappedStatus = "draft";
  else if (rawStatus === "completed" || rawStatus === "passe") mappedStatus = "archived";
  else if (rawStatus === "cancelled") mappedStatus = "draft";
  else if (rawStatus === "confirmed") mappedStatus = "confirmed";
  else mappedStatus = "published";

  // Normalisation de la catégorie
  let mappedCat: EventCategory = "stage";
  const rawCat = (row.category || "").toLowerCase();
  if (rawCat === "camp") mappedCat = "camp";
  else if (rawCat === "special") mappedCat = "special";
  else if (rawCat === "passe" || mappedStatus === "archived") mappedCat = "passe";
  else mappedCat = "stage";

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: mappedCat,
    categoryLabel: row.category_label || (mappedCat === "camp" ? "Camp Intensif" : "Stage Technique"),
    status: mappedStatus,
    isFeatured: Boolean(row.is_featured),
    date: displayDate || "Date à venir",
    time: displayTime || "Horaires à venir",
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    location: row.location || "Striking Camp Marseille (13010)",
    coach: row.coach || "Mahfoud Mohamed",
    price: row.price || "Sur réservation",
    spots: row.spots || undefined,
    description: row.description || "",
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    registrationUrl: row.registration_url || "/connexion",
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Récupère tous les événements publiés pour le site public
 * Avec résilience totale : fallback gracieux sur les données statiques si Supabase n'est pas encore migré
 */
export async function getPublicEvents(supabase?: SupabaseClient): Promise<ClubEvent[]> {
  try {
    if (!supabase) {
      return clubEvents;
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .in("status", ["published", "completed"])
      .order("is_featured", { ascending: false })
      .order("starts_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.warn("[getPublicEvents] Fallback sur clubEvents statiques :", error.message);
      return clubEvents;
    }

    if (!data || data.length === 0) {
      return clubEvents;
    }

    return (data as DbEventRow[]).map(mapDbEventToClubEvent);
  } catch (err) {
    console.warn("[getPublicEvents] Exception, fallback sur clubEvents :", err);
    return clubEvents;
  }
}
