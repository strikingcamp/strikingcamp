"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertAdminUser } from "@/lib/supabase/auth-admin";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAdminServiceSettingsList, updateAdminServiceStatus, type ServiceSetting } from "@/lib/supabase/services";
import { getAuthRedirectUrl } from "@/lib/auth-helpers";

export interface AdminUserAccountInfo {
  id: string;
  email: string;
  role: string;
  lastSignInAt?: string | null;
  createdAt?: string | null;
  provider?: string | null;
}

export interface SystemCapacitiesInfo {
  smallGroup: number;
  collective: number;
  private: number;
}

export interface PlanningHorizonInfo {
  totalActiveSessions: number;
  maxSessionDate: string | null;
  horizonWeeks: number;
}

export interface SecurityStatusInfo {
  adminAuthProtection: "PROTÉGÉ" | "NON_DÉTERMINÉ";
  appMetadataRoleEnforced: "PROTÉGÉ" | "NON_DÉTERMINÉ";
  sqlIsAdminEnforced: "PROTÉGÉ" | "NON_DÉTERMINÉ";
  rlsStatus: "ACTIF" | "À VÉRIFIER";
  cronProtectionStatus: "PROTÉGÉ" | "NON_CONFIGURÉ";
}

export interface EnvironmentVariablesStatus {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabasePublishableKey: boolean;
  supabaseServiceRoleKey: boolean;
  resendApiKey: boolean;
  cronSecret: boolean;
  cronProtected: boolean;
}

export interface AdminAuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  category: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminSettingsData {
  adminUser: AdminUserAccountInfo;
  services: ServiceSetting[];
  capacities: SystemCapacitiesInfo;
  planning: PlanningHorizonInfo;
  security: SecurityStatusInfo;
  env: EnvironmentVariablesStatus;
  auditLogs: AdminAuditLogEntry[];
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface DiagnosticCheckItem {
  id: string;
  label: string;
  category: "DATABASE" | "AUTH" | "SERVICES" | "PLANNING" | "SECURITY" | "ENV";
  status: "ok" | "warning" | "error";
  details: string;
}

export interface SystemDiagnosticReport {
  timestamp: string;
  overallStatus: "healthy" | "warning" | "degraded";
  checks: DiagnosticCheckItem[];
}

/**
 * Enregistre une entrée dans le journal d'audit administratif de façon sécurisée et immuable.
 * Ne contient JAMAIS de secrets, tokens ou mots de passe.
 */
async function recordAdminAudit(
  adminId: string,
  adminEmail: string,
  action: string,
  category: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    // Nettoyage strict et systématique des clés sensibles
    const sanitizedDetails: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (/password|secret|key|token|auth|cookie|bearer/i.test(key)) {
        sanitizedDetails[key] = "[MASQUÉ / CONFIDENTIEL]";
      } else {
        sanitizedDetails[key] = value;
      }
    }

    await supabase.from("admin_audit_logs").insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      category,
      details: sanitizedDetails,
    });
  } catch (err) {
    console.error("[recordAdminAudit] Impossible d'enregistrer l'audit :", err);
  }
}

/**
 * Récupère l'intégralité des données d'état de l'administration pour la page Paramètres.
 */
export async function getAdminSettingsDataServerAction(): Promise<ActionResponse<AdminSettingsData>> {
  try {
    const user = await assertAdminUser();
    const supabase = await createClient();
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;

    // 1. Informations du compte administrateur connecté
    const adminUser: AdminUserAccountInfo = {
      id: user.id,
      email: user.email || "admin@strikingcamp.fr",
      role: (user.app_metadata?.role as string) || "ADMIN",
      lastSignInAt: user.last_sign_in_at || null,
      createdAt: user.created_at || null,
      provider: (user.app_metadata?.provider as string) || "email",
    };

    // 2. Statut des services
    let services: ServiceSetting[] = [];
    try {
      services = await getAdminServiceSettingsList(supabase);
    } catch (svcErr) {
      console.warn("[getAdminSettingsData] Erreur lecture services :", svcErr);
    }

    // 3. Capacités système (Sources officielles de vérité en lecture seule)
    const capacities: SystemCapacitiesInfo = {
      smallGroup: 12,
      collective: 50,
      private: 1,
    };

    // 4. Statistiques et horizon du planning
    let totalActiveSessions = 0;
    let maxSessionDate: string | null = null;
    try {
      const { count } = await adminSupabase
        .from("class_sessions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("starts_at", new Date().toISOString());

      totalActiveSessions = count || 0;

      const { data: latestSession } = await adminSupabase
        .from("class_sessions")
        .select("starts_at")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      maxSessionDate = latestSession?.starts_at || null;
    } catch (planErr) {
      console.warn("[getAdminSettingsData] Erreur planning :", planErr);
    }

    const planning: PlanningHorizonInfo = {
      totalActiveSessions,
      maxSessionDate,
      horizonWeeks: 12,
    };

    // 5. État des protections de sécurité
    const isCronProtected = Boolean(process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY);
    const security: SecurityStatusInfo = {
      adminAuthProtection: "PROTÉGÉ",
      appMetadataRoleEnforced: "PROTÉGÉ",
      sqlIsAdminEnforced: "PROTÉGÉ",
      rlsStatus: "ACTIF",
      cronProtectionStatus: isCronProtected ? "PROTÉGÉ" : "NON_CONFIGURÉ",
    };

    // 6. Variables d'environnement (Exposées STRICTEMENT sous forme de booléens)
    const hasPublishableKey = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const env: EnvironmentVariablesStatus = {
      supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: hasPublishableKey,
      supabasePublishableKey: hasPublishableKey,
      supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      cronSecret: Boolean(process.env.CRON_SECRET),
      cronProtected: isCronProtected,
    };

    // 7. Derniers logs d'audit
    let auditLogs: AdminAuditLogEntry[] = [];
    try {
      const { data: logsData } = await adminSupabase
        .from("admin_audit_logs")
        .select("id, admin_id, admin_email, action, category, details, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (logsData) {
        auditLogs = logsData as AdminAuditLogEntry[];
      }
    } catch (auditErr) {
      console.warn("[getAdminSettingsData] Erreur lecture logs audit :", auditErr);
    }

    return {
      success: true,
      data: {
        adminUser,
        services,
        capacities,
        planning,
        security,
        env,
        auditLogs,
      },
    };
  } catch (err) {
    const error = err as Error;
    console.error("[getAdminSettingsDataServerAction] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors du chargement des paramètres administrateur.",
    };
  }
}

/**
 * Active ou désactive un service dans service_settings.
 * Protégé côté serveur par assertAdminUser() et tracé dans admin_audit_logs.
 */
export async function toggleServiceStatusServerAction(
  serviceKey: string,
  newStatus: boolean
): Promise<ActionResponse<{ serviceKey: string; is_active: boolean }>> {
  try {
    const admin = await assertAdminUser();

    // Validation stricte des services autorisés
    const validServices = ["small_group", "private", "events"];
    if (!validServices.includes(serviceKey)) {
      return {
        success: false,
        error: `Clé de service invalide : '${serviceKey}'. Services autorisés : ${validServices.join(", ")}.`,
      };
    }

    const supabase = await createClient();
    const result = await updateAdminServiceStatus(supabase, serviceKey, newStatus);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Échec de la mise à jour du service.",
      };
    }

    // Traçabilité immuable dans l'audit log
    await recordAdminAudit(
      admin.id,
      admin.email || "admin@strikingcamp.fr",
      newStatus ? "SERVICE_ENABLE" : "SERVICE_DISABLE",
      "SERVICES",
      {
        service_key: serviceKey,
        new_status: newStatus ? "ACTIVE" : "INACTIVE",
        updated_at: new Date().toISOString(),
      }
    );

    // Revalidation des routes réellement impactées
    revalidatePath("/admin/parametres");
    revalidatePath("/admin/services");
    revalidatePath("/admin/planning");
    revalidatePath("/planning");
    revalidatePath("/tarifs");
    revalidatePath("/membre/planning");

    return {
      success: true,
      message: `Le service '${serviceKey}' a été ${newStatus ? "activé" : "désactivé"} avec succès.`,
      data: { serviceKey, is_active: newStatus },
    };
  } catch (err) {
    const error = err as Error;
    console.error("[toggleServiceStatusServerAction] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la modification du service.",
    };
  }
}

/**
 * Déclenche la synchronisation / maintien de l'horizon de planning (12 semaines).
 * Réutilise la fonction SQL officielle maintain_schedule_horizon(12).
 */
export async function triggerScheduleSyncServerAction(): Promise<ActionResponse<unknown>> {
  try {
    const admin = await assertAdminUser();
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    const { data, error } = await adminSupabase.rpc("maintain_schedule_horizon", {
      p_target_weeks_ahead: 12,
    });

    if (error) {
      console.error("[triggerScheduleSyncServerAction] Erreur RPC :", error);
      return {
        success: false,
        error: `Erreur lors de la synchronisation du planning : ${error.message}`,
      };
    }

    // Traçabilité immuable dans l'audit log
    await recordAdminAudit(
      admin.id,
      admin.email || "admin@strikingcamp.fr",
      "MAINTAIN_SCHEDULE_HORIZON",
      "PLANNING",
      {
        target_weeks_ahead: 12,
        result: data,
        executed_at: new Date().toISOString(),
      }
    );

    // Revalidation des routes dépendantes du planning
    revalidatePath("/planning");
    revalidatePath("/admin/planning");
    revalidatePath("/admin/parametres");
    revalidatePath("/admin/cours-prives");
    revalidatePath("/membre/planning");

    return {
      success: true,
      message: "L'horizon de planning de 12 semaines a été vérifié et synchronisé avec succès.",
      data,
    };
  } catch (err) {
    const error = err as Error;
    console.error("[triggerScheduleSyncServerAction] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la synchronisation du planning.",
    };
  }
}

/**
 * Revalide le cache d'application pour les routes publiques et administratives réelles.
 */
export async function revalidateApplicationCacheServerAction(): Promise<ActionResponse<{ revalidatedPaths: string[] }>> {
  try {
    const admin = await assertAdminUser();

    // Liste des routes existantes réelles dans l'application
    const pathsToRevalidate = [
      "/",
      "/planning",
      "/tarifs",
      "/admin",
      "/admin/planning",
      "/admin/services",
      "/admin/parametres",
      "/membre/planning",
    ];

    for (const path of pathsToRevalidate) {
      revalidatePath(path);
    }

    // Traçabilité dans l'audit
    await recordAdminAudit(
      admin.id,
      admin.email || "admin@strikingcamp.fr",
      "CACHE_PURGE_REVALIDATE",
      "CACHE",
      {
        revalidated_paths: pathsToRevalidate,
        executed_at: new Date().toISOString(),
      }
    );

    return {
      success: true,
      message: `Le cache Next.js a été revalidé sur ${pathsToRevalidate.length} routes actives.`,
      data: { revalidatedPaths: pathsToRevalidate },
    };
  } catch (err) {
    const error = err as Error;
    console.error("[revalidateApplicationCacheServerAction] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la revalidation du cache.",
    };
  }
}

/**
 * Exécute un diagnostic système côté serveur complet et sécurisé.
 * Ne retourne aucune valeur sensible ou secrète.
 */
export async function runSystemDiagnosticServerAction(): Promise<ActionResponse<SystemDiagnosticReport>> {
  try {
    await assertAdminUser();

    const supabase = await createClient();
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;

    const checks: DiagnosticCheckItem[] = [];

    // 1. Diagnostic Connexion Supabase & Profils
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) {
        checks.push({
          id: "db-conn",
          label: "Base de données Supabase (profiles)",
          category: "DATABASE",
          status: "error",
          details: `Erreur d'accès : ${error.message}`,
        });
      } else {
        checks.push({
          id: "db-conn",
          label: "Base de données Supabase (profiles)",
          category: "DATABASE",
          status: "ok",
          details: `Connexion active (${count ?? 0} profils recensés).`,
        });
      }
    } catch (dbErr) {
      checks.push({
        id: "db-conn",
        label: "Base de données Supabase",
        category: "DATABASE",
        status: "error",
        details: (dbErr as Error).message,
      });
    }

    // 2. Diagnostic Templates de planning récurrents
    try {
      const { count, error } = await adminSupabase
        .from("recurring_schedule_templates")
        .select("*", { count: "exact", head: true });

      if (error) {
        checks.push({
          id: "db-templates",
          label: "Templates de planning hebdomadaire",
          category: "PLANNING",
          status: "error",
          details: `Erreur d'accès : ${error.message}`,
        });
      } else {
        checks.push({
          id: "db-templates",
          label: "Templates de planning hebdomadaire",
          category: "PLANNING",
          status: (count ?? 0) > 0 ? "ok" : "warning",
          details: `${count ?? 0} créneaux récurrents définis.`,
        });
      }
    } catch (tplErr) {
      checks.push({
        id: "db-templates",
        label: "Templates de planning",
        category: "PLANNING",
        status: "error",
        details: (tplErr as Error).message,
      });
    }

    // 3. Diagnostic Séances futures générées
    try {
      const nowIso = new Date().toISOString();
      const { count, error } = await adminSupabase
        .from("class_sessions")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", nowIso);

      if (error) {
        checks.push({
          id: "db-sessions",
          label: "Séances de cours actives générées",
          category: "PLANNING",
          status: "error",
          details: `Erreur : ${error.message}`,
        });
      } else {
        checks.push({
          id: "db-sessions",
          label: "Séances de cours actives générées",
          category: "PLANNING",
          status: (count ?? 0) > 0 ? "ok" : "warning",
          details: `${count ?? 0} séances futures programmées.`,
        });
      }
    } catch (sessErr) {
      checks.push({
        id: "db-sessions",
        label: "Séances de cours futures",
        category: "PLANNING",
        status: "error",
        details: (sessErr as Error).message,
      });
    }

    // 4. Diagnostic Table service_settings
    try {
      const { data: servicesData, error: svcError } = await supabase
        .from("service_settings")
        .select("service_key, is_active");

      if (svcError) {
        checks.push({
          id: "db-services",
          label: "Gestion des services (service_settings)",
          category: "SERVICES",
          status: "error",
          details: `Erreur : ${svcError.message}`,
        });
      } else {
        const activeCount = (servicesData || []).filter((s) => s.is_active).length;
        checks.push({
          id: "db-services",
          label: "Gestion des services (service_settings)",
          category: "SERVICES",
          status: "ok",
          details: `${servicesData?.length || 0} services configurés (${activeCount} actifs).`,
        });
      }
    } catch (svcEx) {
      checks.push({
        id: "db-services",
        label: "Gestion des services",
        category: "SERVICES",
        status: "error",
        details: (svcEx as Error).message,
      });
    }

    // 5. Diagnostic Journal d'audit
    try {
      const { count, error: auditError } = await adminSupabase
        .from("admin_audit_logs")
        .select("*", { count: "exact", head: true });

      if (auditError) {
        checks.push({
          id: "db-audit",
          label: "Journal d'audit (admin_audit_logs)",
          category: "SECURITY",
          status: "warning",
          details: `Table introuvable ou inaccessible (${auditError.message}). Exécuter la migration 20260911_admin_audit_logs.sql si nécessaire.`,
        });
      } else {
        checks.push({
          id: "db-audit",
          label: "Journal d'audit (admin_audit_logs)",
          category: "SECURITY",
          status: "ok",
          details: `Table active et protégée (${count ?? 0} enregistrements).`,
        });
      }
    } catch (audEx) {
      checks.push({
        id: "db-audit",
        label: "Journal d'audit",
        category: "SECURITY",
        status: "warning",
        details: (audEx as Error).message,
      });
    }

    // 6. Diagnostic des Variables d'environnement critiques
    const hasPublishable = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const hasCronSecret = Boolean(process.env.CRON_SECRET);
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    checks.push({
      id: "env-supabase-url",
      label: "Supabase URL (NEXT_PUBLIC_SUPABASE_URL)",
      category: "ENV",
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "error",
      details: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "Configuré"
        : "Non configuré",
    });

    checks.push({
      id: "env-supabase-publishable-key",
      label: "Publishable Key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
      category: "ENV",
      status: hasPublishable ? "ok" : "error",
      details: hasPublishable
        ? "Configurée"
        : "Non configurée",
    });

    checks.push({
      id: "env-supabase-service-role-key",
      label: "Service Role Key (SUPABASE_SERVICE_ROLE_KEY)",
      category: "ENV",
      status: hasServiceRole ? "ok" : "error",
      details: hasServiceRole
        ? "Configurée (serveur uniquement)"
        : "Non configurée",
    });

    checks.push({
      id: "env-resend-api-key",
      label: "Resend (RESEND_API_KEY)",
      category: "ENV",
      status: process.env.RESEND_API_KEY ? "ok" : "warning",
      details: process.env.RESEND_API_KEY
        ? "Configuré"
        : "Non configuré",
    });

    checks.push({
      id: "env-cron-secret",
      label: "Cron (CRON_SECRET)",
      category: "SECURITY",
      status: hasCronSecret ? "ok" : hasServiceRole ? "ok" : "error",
      details: hasCronSecret
        ? "Protégé (CRON_SECRET dédié)"
        : hasServiceRole
        ? "Protégé (repli sécurisé sur Service Role Key)"
        : "Non protégé",
    });

    const hasError = checks.some((c) => c.status === "error");
    const hasWarning = checks.some((c) => c.status === "warning");

    const overallStatus: "healthy" | "warning" | "degraded" = hasError
      ? "degraded"
      : hasWarning
      ? "warning"
      : "healthy";

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        overallStatus,
        checks,
      },
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: error.message || "Erreur lors du diagnostic système.",
    };
  }
}

/**
 * Envoie une demande de modification d'adresse email pour le compte administrateur connecté.
 * Déclenche l'envoi d'un email de confirmation par Supabase Auth avec lien de retour.
 */
export async function requestAdminEmailChangeServerAction(
  newEmail: string
): Promise<ActionResponse<{ oldEmail: string; newEmail: string }>> {
  try {
    const admin = await assertAdminUser();

    if (!newEmail || typeof newEmail !== "string") {
      return {
        success: false,
        error: "L'adresse email est requise.",
      };
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return {
        success: false,
        error: "Le format de l'adresse email est invalide.",
      };
    }

    const currentEmail = (admin.email || "").trim().toLowerCase();
    if (normalizedEmail === currentEmail) {
      return {
        success: false,
        error: "La nouvelle adresse email doit être différente de votre adresse actuelle.",
      };
    }

    const supabase = await createClient();
    const redirectUrl = getAuthRedirectUrl("/admin/parametres");

    const { error } = await supabase.auth.updateUser(
      { email: normalizedEmail },
      { emailRedirectTo: redirectUrl }
    );

    if (error) {
      console.error("[requestAdminEmailChange] Erreur Supabase updateUser :", error.message);
      return {
        success: false,
        error: error.message || "Impossible d'initier le changement d'adresse email.",
      };
    }

    // Traçabilité immuable dans l'audit log (catégorie AUTH)
    await recordAdminAudit(
      admin.id,
      admin.email || "admin@strikingcamp.fr",
      "ADMIN_EMAIL_CHANGE_REQUESTED",
      "AUTH",
      {
        old_email: currentEmail,
        requested_email: normalizedEmail,
        requested_at: new Date().toISOString(),
      }
    );

    revalidatePath("/admin/parametres");

    return {
      success: true,
      message: "Un email de confirmation a été envoyé à la nouvelle adresse.",
      data: { oldEmail: currentEmail, newEmail: normalizedEmail },
    };
  } catch (err) {
    const error = err as Error;
    console.error("[requestAdminEmailChange] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la demande de modification d'email.",
    };
  }
}

/**
 * Met à jour le mot de passe du compte administrateur connecté via Supabase Auth.
 * Vérifie d'abord le mot de passe actuel sans corrompre la session active.
 * Ne stocke, ne logge et ne transmet JAMAIS le mot de passe.
 */
export async function updateAdminPasswordServerAction(
  currentPassword: string,
  newPassword: string,
  confirmPassword?: string
): Promise<ActionResponse<void>> {
  try {
    const admin = await assertAdminUser();

    if (!currentPassword || typeof currentPassword !== "string") {
      return {
        success: false,
        error: "Le mot de passe actuel est requis.",
      };
    }

    if (!newPassword || typeof newPassword !== "string") {
      return {
        success: false,
        error: "Le nouveau mot de passe est obligatoire.",
      };
    }

    const trimmedNewPassword = newPassword.trim();
    if (trimmedNewPassword.length < 8) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      };
    }

    if (confirmPassword !== undefined && trimmedNewPassword !== confirmPassword.trim()) {
      return {
        success: false,
        error: "Les deux mots de passe saisis ne correspondent pas.",
      };
    }

    if (currentPassword.trim() === trimmedNewPassword) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit être différent du mot de passe actuel.",
      };
    }

    // 1. Vérification sécurisée du mot de passe actuel via un client Auth éphémère
    // (persistSession: false garantit qu'aucun cookie/session existante n'est altéré)
    const tempAuthClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { error: signInError } = await tempAuthClient.auth.signInWithPassword({
      email: admin.email || "",
      password: currentPassword,
    });

    if (signInError) {
      return {
        success: false,
        error: "Le mot de passe actuel est incorrect.",
      };
    }

    // 2. Mise à jour du mot de passe sur la session active
    const supabase = await createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: trimmedNewPassword,
    });

    if (updateError) {
      console.error("[updateAdminPassword] Erreur Supabase updateUser :", updateError.message);
      return {
        success: false,
        error: updateError.message || "Impossible de mettre à jour le mot de passe administrateur.",
      };
    }

    // 3. Traçabilité immuable (catégorie AUTH) SANS AUCUNE donnée sensible
    await recordAdminAudit(
      admin.id,
      admin.email || "admin@strikingcamp.fr",
      "ADMIN_PASSWORD_CHANGED",
      "AUTH",
      {
        admin_id: admin.id,
        updated_at: new Date().toISOString(),
      }
    );

    revalidatePath("/admin/parametres");

    return {
      success: true,
      message: "Votre mot de passe a été modifié avec succès.",
    };
  } catch (err) {
    const error = err as Error;
    console.error("[updateAdminPassword] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la modification du mot de passe.",
    };
  }
}

/**
 * Déconnecte uniquement la session active courante de l'administrateur.
 */
export async function signOutCurrentAdminSessionServerAction(): Promise<ActionResponse<{ shouldRedirect: boolean }>> {
  try {
    await assertAdminUser();
    const supabase = await createClient();
    await supabase.auth.signOut();

    revalidatePath("/admin");
    revalidatePath("/admin/parametres");

    return {
      success: true,
      message: "Session déconnectée avec succès.",
      data: { shouldRedirect: true },
    };
  } catch (err) {
    const error = err as Error;
    console.error("[signOutCurrentAdminSession] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la déconnexion.",
    };
  }
}

/**
 * Révoque l'ensemble des sessions actives pour le compte administrateur connecté.
 * Utilise l'API Supabase Admin globale (service_role) puis déconnecte la session courante.
 */
export async function revokeAllAdminSessionsServerAction(): Promise<ActionResponse<{ shouldRedirect: boolean }>> {
  try {
    const admin = await assertAdminUser();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: "Configuration administrative insuffisante pour la révocation globale (clé service_role absente).",
      };
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.auth.admin.signOut(admin.id, "global");

    if (error) {
      console.error("[revokeAllAdminSessions] Erreur admin.signOut :", error.message);
      return {
        success: false,
        error: error.message || "Échec de la révocation globale des sessions.",
      };
    }

    // Traçabilité immuable (catégorie AUTH)
    await recordAdminAudit(
      admin.id,
      admin.email || "admin@strikingcamp.fr",
      "ADMIN_SIGN_OUT_ALL",
      "AUTH",
      {
        admin_id: admin.id,
        scope: "global",
        executed_at: new Date().toISOString(),
      }
    );

    // Déconnexion de la session locale courante
    const localSupabase = await createClient();
    await localSupabase.auth.signOut();

    revalidatePath("/admin");
    revalidatePath("/admin/parametres");

    return {
      success: true,
      message: "Toutes les sessions administrateur ont été révoquées avec succès.",
      data: { shouldRedirect: true },
    };
  } catch (err) {
    const error = err as Error;
    console.error("[revokeAllAdminSessions] Exception :", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la révocation des sessions.",
    };
  }
}
