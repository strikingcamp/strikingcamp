"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventCategory, EventStatus } from "@/data/events";

export interface EventMutationPayload {
  title: string;
  slug?: string;
  category: EventCategory;
  categoryLabel?: string;
  status: EventStatus;
  isFeatured?: boolean;
  dateDisplay: string;
  timeDisplay: string;
  startsAt?: string | null;
  endsAt?: string | null;
  location: string;
  coach: string;
  price: string;
  spots?: string | null;
  description: string;
  highlights: string[];
  registrationUrl?: string | null;
  imageUrl?: string | null;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * Génère un slug URL propre à partir d'une chaîne
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9]+/g, "-") // Remplacer caractères spéciaux par tirets
    .replace(/^-+|-+$/g, "") // Supprimer tirets début/fin
    .slice(0, 80);
}

/**
 * Vérification stricte de l'authentification et du rôle ADMIN
 */
async function verifyAdminAuth() {
  const sessionSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionSupabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, error: "Session invalide ou expirée. Veuillez vous reconnecter." };
  }

  const role = (user.app_metadata?.role || user.user_metadata?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    return { authorized: false, error: "Accès refusé. Privilèges administrateur requis." };
  }

  return { authorized: true, user, sessionSupabase };
}

/**
 * Retourne un client Supabase avec privilèges d'écriture pour les événements.
 * Priorise createAdminClient() si SUPABASE_SERVICE_ROLE_KEY est disponible.
 * Sinon, utilise le client de session de l'administrateur connecté, garanti par la policy RLS `public.is_admin() = true`.
 */
function getEventsDbClient(sessionSupabase: SupabaseClient): SupabaseClient {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch (err) {
      console.warn("[getEventsDbClient] Fallback sur sessionSupabase admin :", err);
    }
  }
  return sessionSupabase;
}

/**
 * Invalide les caches Next.js pertinents
 */
function invalidateEventsCaches() {
  revalidatePath("/evenements");
  revalidatePath("/admin/evenements");
  revalidatePath("/admin");
}

/**
 * Résout l'identifiant réel UUID d'un événement en base.
 * Si l'identifiant fourni est déjà un UUID, le retourne directement.
 * S'il s'agit d'un ID statique de fallback (ex: 'evt-1'), recherche par slug ou titre en base.
 */
async function resolveRealEventId(
  db: SupabaseClient,
  idOrFallback: string,
  slugHint?: string,
  titleHint?: string
): Promise<{ id: string; starts_at?: string | null; ends_at?: string | null } | null> {
  if (isUuid(idOrFallback)) {
    const { data } = await db
      .from("events")
      .select("id, starts_at, ends_at")
      .eq("id", idOrFallback)
      .maybeSingle();
    return data || { id: idOrFallback };
  }

  // Si l'ID est un fallback statique, résoudre par slug
  if (slugHint) {
    const { data: bySlug } = await db
      .from("events")
      .select("id, starts_at, ends_at")
      .eq("slug", slugHint)
      .maybeSingle();

    if (bySlug) return bySlug;
  }

  // Tenter par titre
  if (titleHint) {
    const { data: byTitle } = await db
      .from("events")
      .select("id, starts_at, ends_at")
      .ilike("title", titleHint.trim())
      .maybeSingle();

    if (byTitle) return byTitle;
  }

  return null;
}

/**
 * Action Serveur : Créer un nouvel événement
 */
export async function createEventServerAction(
  payload: EventMutationPayload
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.sessionSupabase) {
      return { success: false, error: auth.error };
    }

    if (!payload.title || !payload.title.trim()) {
      return { success: false, error: "Le titre de l'événement est obligatoire." };
    }

    const db = getEventsDbClient(auth.sessionSupabase);
    const baseSlug = payload.slug?.trim() ? slugify(payload.slug) : slugify(payload.title);
    const slug = baseSlug || `event-${Date.now()}`;

    // Normalisation de statut pour la colonne PostgreSQL public.event_status
    let dbStatus = "draft";
    if (payload.status === "published") dbStatus = "published";
    else if (payload.status === "archived") dbStatus = "completed";
    else if (payload.status === "draft") dbStatus = "draft";
    else dbStatus = "published";

    // Si l'événement est marqué comme mis en avant (featured), désactiver les autres
    if (payload.isFeatured) {
      await db
        .from("events")
        .update({ is_featured: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const insertData = {
      title: payload.title.trim(),
      slug,
      category: payload.category || "stage",
      category_label: payload.categoryLabel?.trim() || "Stage Technique",
      status: dbStatus,
      is_featured: Boolean(payload.isFeatured),
      date_display: payload.dateDisplay.trim(),
      time_display: payload.timeDisplay.trim(),
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      location: payload.location.trim() || "Striking Camp Marseille",
      coach: payload.coach.trim() || "Mahfoud Mohamed",
      price: payload.price.trim() || "Sur réservation",
      spots: payload.spots?.trim() || null,
      description: payload.description.trim() || "",
      highlights: Array.isArray(payload.highlights) ? payload.highlights.filter((h) => h.trim()) : [],
      registration_url: payload.registrationUrl?.trim() || "/connexion",
      image_url: payload.imageUrl?.trim() || null,
    };

    const { data, error } = await db
      .from("events")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("[createEventServerAction] Erreur Supabase :", error);
      return { success: false, error: `Erreur base de données : ${error.message}` };
    }

    invalidateEventsCaches();
    return { success: true, data: { id: data.id }, message: "Événement créé avec succès." };
  } catch (err) {
    console.error("[createEventServerAction] Exception :", err);
    return { success: false, error: (err as Error)?.message || "Erreur interne du serveur." };
  }
}

/**
 * Action Serveur : Mettre à jour un événement existant
 */
export async function updateEventServerAction(
  id: string,
  payload: EventMutationPayload
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.sessionSupabase) {
      return { success: false, error: auth.error };
    }

    if (!id || typeof id !== "string") {
      return { success: false, error: "Identifiant d'événement manquant." };
    }

    if (!payload.title || !payload.title.trim()) {
      return { success: false, error: "Le titre de l'événement est obligatoire." };
    }

    const db = getEventsDbClient(auth.sessionSupabase);
    const baseSlug = payload.slug?.trim() ? slugify(payload.slug) : slugify(payload.title);

    // Résoudre l'UUID réel si l'ID provient d'un repli statique (ex: 'evt-1')
    const resolved = await resolveRealEventId(db, id, baseSlug, payload.title);
    if (!resolved || !resolved.id) {
      return {
        success: false,
        error: "Cet événement n'a pas été trouvé dans la base de données. Veuillez actualiser la page.",
      };
    }

    const realId = resolved.id;

    let dbStatus = "draft";
    if (payload.status === "published") dbStatus = "published";
    else if (payload.status === "archived") dbStatus = "completed";
    else if (payload.status === "draft") dbStatus = "draft";
    else dbStatus = "published";

    // Si on met en avant, retirer le flag sur les autres événements
    if (payload.isFeatured) {
      await db
        .from("events")
        .update({ is_featured: false })
        .neq("id", realId);
    }

    // Préserver starts_at et ends_at existants si non redéfinis explicitement
    const startsAt =
      payload.startsAt !== undefined ? payload.startsAt : (resolved.starts_at || null);
    const endsAt =
      payload.endsAt !== undefined ? payload.endsAt : (resolved.ends_at || null);

    const updateData = {
      title: payload.title.trim(),
      slug: baseSlug,
      category: payload.category || "stage",
      category_label: payload.categoryLabel?.trim() || "Stage Technique",
      status: dbStatus,
      is_featured: Boolean(payload.isFeatured),
      date_display: payload.dateDisplay.trim(),
      time_display: payload.timeDisplay.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
      location: payload.location.trim() || "Striking Camp Marseille",
      coach: payload.coach.trim() || "Mahfoud Mohamed",
      price: payload.price.trim() || "Sur réservation",
      spots: payload.spots?.trim() || null,
      description: payload.description.trim() || "",
      highlights: Array.isArray(payload.highlights) ? payload.highlights.filter((h) => h.trim()) : [],
      registration_url: payload.registrationUrl?.trim() || "/connexion",
      image_url: payload.imageUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await db
      .from("events")
      .update(updateData)
      .eq("id", realId);

    if (error) {
      console.error("[updateEventServerAction] Erreur Supabase :", error);
      return { success: false, error: `Erreur mise à jour : ${error.message}` };
    }

    invalidateEventsCaches();
    return { success: true, data: { id: realId }, message: "Événement mis à jour avec succès." };
  } catch (err) {
    console.error("[updateEventServerAction] Exception :", err);
    return { success: false, error: (err as Error)?.message || "Erreur interne du serveur." };
  }
}

/**
 * Action Serveur : Basculer le statut de publication (publié <-> brouillon)
 */
export async function togglePublishEventServerAction(
  id: string,
  newStatus: "published" | "draft" | "archived"
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.sessionSupabase) {
      return { success: false, error: auth.error };
    }

    const db = getEventsDbClient(auth.sessionSupabase);
    const resolved = await resolveRealEventId(db, id);
    const realId = resolved?.id || id;

    if (!isUuid(realId)) {
      return {
        success: false,
        error: "Impossible d'identifier l'événement dans la base. Veuillez actualiser la page.",
      };
    }

    let dbStatus = "draft";
    if (newStatus === "published") dbStatus = "published";
    else if (newStatus === "archived") dbStatus = "completed";
    else dbStatus = "draft";

    const { error } = await db
      .from("events")
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq("id", realId);

    if (error) {
      return { success: false, error: error.message };
    }

    invalidateEventsCaches();
    return {
      success: true,
      data: { id: realId },
      message: newStatus === "published" ? "Événement publié en ligne." : "Événement mis en brouillon.",
    };
  } catch (err) {
    return { success: false, error: (err as Error)?.message || "Erreur interne." };
  }
}

/**
 * Action Serveur : Basculer le statut "Mis en avant"
 */
export async function toggleFeaturedEventServerAction(
  id: string,
  makeFeatured: boolean
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.sessionSupabase) {
      return { success: false, error: auth.error };
    }

    const db = getEventsDbClient(auth.sessionSupabase);
    const resolved = await resolveRealEventId(db, id);
    const realId = resolved?.id || id;

    if (!isUuid(realId)) {
      return {
        success: false,
        error: "Impossible d'identifier l'événement dans la base. Veuillez actualiser la page.",
      };
    }

    if (makeFeatured) {
      // Retirer le featured de tous les autres événements
      await db.from("events").update({ is_featured: false }).neq("id", realId);
    }

    const { error } = await db
      .from("events")
      .update({ is_featured: makeFeatured, updated_at: new Date().toISOString() })
      .eq("id", realId);

    if (error) {
      return { success: false, error: error.message };
    }

    invalidateEventsCaches();
    return {
      success: true,
      data: { id: realId },
      message: makeFeatured ? "Événement défini comme mis en avant." : "Mise en avant retirée.",
    };
  } catch (err) {
    return { success: false, error: (err as Error)?.message || "Erreur interne." };
  }
}

/**
 * Action Serveur : Supprimer un événement
 */
export async function deleteEventServerAction(id: string): Promise<ActionResult> {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.sessionSupabase) {
      return { success: false, error: auth.error };
    }

    const db = getEventsDbClient(auth.sessionSupabase);
    const resolved = await resolveRealEventId(db, id);
    const realId = resolved?.id || id;

    if (!isUuid(realId)) {
      return {
        success: false,
        error: "Impossible d'identifier l'événement dans la base. Veuillez actualiser la page.",
      };
    }

    const { error } = await db.from("events").delete().eq("id", realId);

    if (error) {
      return { success: false, error: error.message };
    }

    invalidateEventsCaches();
    return { success: true, message: "Événement supprimé avec succès." };
  } catch (err) {
    return { success: false, error: (err as Error)?.message || "Erreur interne." };
  }
}
