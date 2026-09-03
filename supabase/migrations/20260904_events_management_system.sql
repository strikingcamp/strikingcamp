-- =============================================================================
-- STRIKING CAMP — GESTION DES ÉVÉNEMENTS (ADMIN & PUBLIC)
-- FICHIER : 20260904_events_management_system.sql
-- =============================================================================
-- SPÉCIFICATIONS :
--   1. Accorder les privilèges SELECT, INSERT, UPDATE, DELETE sur public.events.
--   2. Étendre la table public.events avec les colonnes nécessaires (catégorie, tarif, places, etc.).
--   3. Activer la sécurité au niveau des lignes (RLS) avec lecture publique des événements publiés
--      et accès complet pour les administrateurs (is_admin()).
--   4. Insérer de manière idempotente (ON CONFLICT DO NOTHING) les événements de référence
--      afin d'assurer une continuité visuelle parfaite sur le site public.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PERMISSIONS D'ACCÈS (GRANTS)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL PRIVILEGES ON public.events TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EXTENSION DU SCHÉMA DE LA TABLE EVENTS (COLONNES ADDITIONNELLES)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'stage',
  ADD COLUMN IF NOT EXISTS category_label TEXT NOT NULL DEFAULT 'Stage Technique',
  ADD COLUMN IF NOT EXISTS price TEXT NOT NULL DEFAULT 'Gratuit',
  ADD COLUMN IF NOT EXISTS spots TEXT,
  ADD COLUMN IF NOT EXISTS coach TEXT DEFAULT 'Mahfoud Mohamed',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS registration_url TEXT,
  ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS date_display TEXT,
  ADD COLUMN IF NOT EXISTS time_display TEXT;

-- Indexation optimisée pour les requêtes publiques et administration
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_slug ON public.events (slug);
CREATE INDEX IF NOT EXISTS idx_events_status_starts ON public.events (status, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events (is_featured) WHERE is_featured = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Supprimer d'anciennes policies si existantes pour recréation propre
DROP POLICY IF EXISTS "Lecture publique des événements publiés" ON public.events;
DROP POLICY IF EXISTS "Accès complet administrateur événements" ON public.events;

-- Règle A : Tout le monde (visiteurs anonymes et connectés) peut consulter les événements publiés
CREATE POLICY "Lecture publique des événements publiés"
  ON public.events
  FOR SELECT
  USING (
    status IN ('published', 'completed')
  );

-- Règle B : Les administrateurs ont tous les droits (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Accès complet administrateur événements"
  ON public.events
  FOR ALL
  TO authenticated
  USING (
    public.is_admin() = true
  )
  WITH CHECK (
    public.is_admin() = true
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INSERTION IDEMPOTENTE DES ÉVÉNEMENTS DU CLUB (INITIAL SEED)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.events (
  title,
  slug,
  category,
  category_label,
  status,
  is_featured,
  date_display,
  time_display,
  starts_at,
  location,
  coach,
  price,
  spots,
  description,
  highlights,
  registration_url
)
VALUES
(
  'Stage Technique Muay Thaï & Corps-à-Corps',
  'stage-muay-thai-avril-2026',
  'stage',
  'Stage Technique',
  'published'::public.event_status,
  TRUE,
  'Samedi 18 Avril 2026',
  '14:00 – 17:30',
  '2026-04-18 14:00:00+02',
  'Striking Camp Marseille (Salle Principale)',
  'Mahfoud Mohamed',
  '45€ (Membres) / 60€ (Externes)',
  '20 places max',
  'Une masterclass intensive de 3h30 dédiée à la maîtrise du clinch (clinch thaï), aux techniques de coudes, genoux et à la gestion du timing en phase rapprochée.',
  ARRAY[
    'Perfectionnement des saisies et des verrous de clinch',
    'Sorties d''axe et déséquilibres en corps-à-corps',
    'Combinaisons coudes/genoux avec protections spécifiques',
    'Mises en situation sous forme de sparring à thèmes'
  ],
  '/connexion'
),
(
  'Striking Summer Camp — 5 Jours d''Immersion',
  'striking-summer-camp-2026',
  'camp',
  'Camp Intensif',
  'published'::public.event_status,
  FALSE,
  'Du 13 au 17 Juillet 2026',
  '09:00 – 17:00 (Tous les jours)',
  '2026-07-13 09:00:00+02',
  'Striking Camp Marseille & Extérieurs',
  'Mahfoud Mohamed + Coachs Invités',
  '290€ la semaine',
  '15 places limitées',
  'Le stage de référence de l''été : 5 jours d''entraînement complet combinant préparation physique, perfectionnement technique pieds-poings, sparring dirigé et récupération sportive.',
  ARRAY[
    'Préparation physique matinale et travail athlétique',
    'Technique pieds-poings avancée l''après-midi',
    'Nutrition sportive & protocoles de récupération',
    'Ambiance d''équipe et esprit combat Striking Camp'
  ],
  '/connexion'
),
(
  'Soirée Inter-Clubs & Sparring Dirigé',
  'inter-clubs-sparring-mai-2026',
  'special',
  'Événement Spécial',
  'published'::public.event_status,
  FALSE,
  'Vendredi 29 Mai 2026',
  '19:00 – 22:00',
  '2026-05-29 19:00:00+02',
  'Striking Camp Marseille',
  'Staff Striking Camp',
  'Gratuit pour les membres',
  'Sur inscription préalable',
  'Une rencontre conviviale et encadrée réunissant plusieurs clubs partenaires de la région marseillaise pour des rounds d''opposition technique et un moment de partage.',
  ARRAY[
    'Sparrings contrôlés par niveaux avec arbitres officiels',
    'Échanges d''expérience entre pratiquants de différents horizons',
    'Collation et moment de convivialité offert après la session'
  ],
  '/connexion'
),
(
  'Masterclass Lady Striking & Self-Défense',
  'masterclass-lady-striking',
  'stage',
  'Stage 100% Féminin',
  'published'::public.event_status,
  FALSE,
  'Samedi 6 Juin 2026',
  '10:00 – 13:00',
  '2026-06-06 10:00:00+02',
  'Striking Camp Marseille',
  'Mahfoud Mohamed',
  '35€',
  '16 places',
  'Session 100% femmes axée sur la puissance de frappe, les réflexes de défense et le renforcement du mental dans un cadre bienveillant et stimulant.',
  ARRAY[
    'Techniques de percussion directes et puissantes',
    'Gestion de la distance et désamorçage de situations d''agression',
    'Circuit cardio-boxing haute intensité'
  ],
  '/connexion'
),
(
  'Stage Hivernal : Puissance & Timing en Kick Boxing',
  'stage-hiver-2026',
  'passe',
  'Événement Passé',
  'completed'::public.event_status,
  FALSE,
  'Février 2026',
  'Terminé',
  '2026-02-01 10:00:00+02',
  'Striking Camp Marseille',
  'Mahfoud Mohamed',
  'Complet',
  NULL,
  'Retour sur un week-end intensif qui a réuni 25 participants autour des stratégies de contre-attaque en K1 et kick-boxing.',
  ARRAY[
    '25 participants certifiés',
    '3 heures d''analyse vidéo et mise en pratique',
    'Édition couronnée de succès'
  ],
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  category_label = EXCLUDED.category_label,
  price = EXCLUDED.price,
  spots = EXCLUDED.spots,
  coach = EXCLUDED.coach,
  is_featured = EXCLUDED.is_featured,
  date_display = EXCLUDED.date_display,
  time_display = EXCLUDED.time_display,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  highlights = EXCLUDED.highlights,
  updated_at = NOW();

COMMIT;
