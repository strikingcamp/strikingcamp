-- =============================================================================
-- Migration : 20261003_defis_progression_platform.sql
-- Description : Plateforme Défis & Progression STRIKING CAMP (Digital + Physique)
--               - Extension non destructive de public.plans (Entitlements, Tiers, Flags digitaux)
--               - Paramètres globaux du moteur nutritionnel (nutrition_platform_settings)
--               - Profils fitness & objectifs (user_fitness_profiles)
--               - Journalisation du poids & mensurations (user_weight_logs)
--               - Bibliothèque de recettes & ingrédients (recipes, recipe_ingredients)
--               - Journal alimentaire quotidien (user_daily_food_logs)
--               - Programmes d'entraînement, sessions et exercices (workout_programs, program_sessions, program_exercises)
--               - Historique des séances réalisées (user_session_completions)
--               - Politiques de sécurité RLS & index de performance
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. EXTENSION DE PUBLIC.PLANS POUR LES OFFRES DIGITALES & ENTITLEMENTS
-- =============================================================================

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_digital_plan BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS entitlements JSONB NOT NULL DEFAULT '{"nutrition": false, "food_log": false, "recipes_all": false, "digital_programs": false, "kb_shred_digital": false, "advanced_stats": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS trial_days INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge_text TEXT NULL;

-- Mise à jour des formules physiques existantes avec tier 'premium_club'
UPDATE public.plans
SET tier = 'premium_club',
    description = COALESCE(description, 'Accès complet aux cours physiques du club Striking Camp'),
    updated_at = NOW()
WHERE code IN ('adult_essential', 'adult_all_access', 'lady_striking_annual', 'kid_boxing_season', 'priv_monthly', 'priv_annual', 'priv_monthly_8', 'priv_annual_8');

-- Insertion de base des offres digitales (Prix initialisés à 0 et is_active = FALSE en attente de validation commerciale)
INSERT INTO public.plans (
  code, name, type, commitment, price_cents, display_order, is_active,
  allows_small_group, allows_private, allows_collective,
  is_digital_plan, tier, description, features, entitlements
) VALUES
(
  'digital_premium_monthly',
  'Striking Digital Premium (Mensuel)',
  'small_group',
  'monthly',
  0,
  10,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  'premium_digital',
  'Accès complet au moteur nutritionnel, programmes d''entraînement maison/salle et KB SHRED Digital.',
  '["Moteur nutritionnel personnalisé", "Journal alimentaire & suivi des macros", "Accès à toutes les recettes sportives", "Programmes d''entraînement maison et salle", "KB SHRED Digital à domicile", "Statistiques de progression avancées"]'::jsonb,
  '{"nutrition": true, "food_log": true, "recipes_all": true, "digital_programs": true, "kb_shred_digital": true, "advanced_stats": true}'::jsonb
),
(
  'digital_premium_annual',
  'Striking Digital Premium (Annuel)',
  'small_group',
  'annual',
  0,
  11,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  'premium_digital',
  'Accès complet annuel au suivi digital avec remise exclusive.',
  '["Moteur nutritionnel personnalisé", "Journal alimentaire & suivi des macros", "Accès à toutes les recettes sportives", "Programmes d''entraînement maison et salle", "KB SHRED Digital à domicile", "Statistiques de progression avancées", "Accompagnement annuel continu"]'::jsonb,
  '{"nutrition": true, "food_log": true, "recipes_all": true, "digital_programs": true, "kb_shred_digital": true, "advanced_stats": true}'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  is_digital_plan = EXCLUDED.is_digital_plan,
  tier = EXCLUDED.tier,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  entitlements = EXCLUDED.entitlements,
  updated_at = NOW();


-- =============================================================================
-- 2. PARAMÈTRES GLOBAUX DU MOTEUR NUTRITIONNEL (NUTRITION_PLATFORM_SETTINGS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.nutrition_platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_bmr_formula TEXT NOT NULL DEFAULT 'mifflin_st_jeor',
  weight_loss_caloric_delta INT NOT NULL DEFAULT -400,
  muscle_gain_caloric_delta INT NOT NULL DEFAULT 300,
  maintenance_caloric_delta INT NOT NULL DEFAULT 0,
  protein_ratio_weight_loss NUMERIC(4,2) NOT NULL DEFAULT 2.00,
  protein_ratio_muscle_gain NUMERIC(4,2) NOT NULL DEFAULT 2.00,
  protein_ratio_maintenance NUMERIC(4,2) NOT NULL DEFAULT 1.60,
  fat_ratio_weight_loss NUMERIC(4,2) NOT NULL DEFAULT 0.90,
  fat_ratio_muscle_gain NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  fat_ratio_maintenance NUMERIC(4,2) NOT NULL DEFAULT 0.90,
  technical_caloric_floor_female INT NOT NULL DEFAULT 1200,
  technical_caloric_floor_male INT NOT NULL DEFAULT 1500,
  disclaimer_text TEXT NOT NULL DEFAULT 'Estimations sportives et nutritionnelles indicatives — Ne constitue pas une prescription médicale.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertion de la configuration par défaut si la table est vide
INSERT INTO public.nutrition_platform_settings (
  default_bmr_formula,
  weight_loss_caloric_delta,
  muscle_gain_caloric_delta,
  maintenance_caloric_delta,
  protein_ratio_weight_loss,
  protein_ratio_muscle_gain,
  protein_ratio_maintenance,
  fat_ratio_weight_loss,
  fat_ratio_muscle_gain,
  fat_ratio_maintenance,
  technical_caloric_floor_female,
  technical_caloric_floor_male,
  disclaimer_text
)
SELECT
  'mifflin_st_jeor', -400, 300, 0,
  2.00, 2.00, 1.60,
  0.90, 1.00, 0.90,
  1200, 1500,
  'Estimations sportives et nutritionnelles indicatives — Ne constitue pas une prescription médicale.'
WHERE NOT EXISTS (SELECT 1 FROM public.nutrition_platform_settings);


-- =============================================================================
-- 3. PROFILS FITNESS & OBJECTIFS MEMBRES (USER_FITNESS_PROFILES)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_fitness_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC(5,2) NOT NULL CHECK (height_cm > 50 AND height_cm < 280),
  current_weight_kg NUMERIC(5,2) NOT NULL CHECK (current_weight_kg > 20 AND current_weight_kg < 350),
  target_weight_kg NUMERIC(5,2) NULL CHECK (target_weight_kg IS NULL OR (target_weight_kg > 20 AND target_weight_kg < 350)),
  activity_level TEXT NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very_active', 'extra_active')),
  target_workouts_per_week INT NOT NULL DEFAULT 3 CHECK (target_workouts_per_week BETWEEN 1 AND 14),
  primary_goal TEXT NOT NULL DEFAULT 'weight_loss' CHECK (primary_goal IN ('weight_loss', 'muscle_gain', 'maintenance', 'recomposition')),
  training_environment TEXT NOT NULL DEFAULT 'hybrid' CHECK (training_environment IN ('home', 'gym', 'club', 'hybrid')),
  available_equipment TEXT[] NOT NULL DEFAULT ARRAY['bodyweight']::TEXT[],
  custom_target_calories INT NULL,
  custom_target_proteins INT NULL,
  custom_target_carbs INT NULL,
  custom_target_fats INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_fitness_profile UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_fitness_profiles_goal ON public.user_fitness_profiles(primary_goal);


-- =============================================================================
-- 4. SUIVI DU POIDS & MENSURATIONS (USER_WEIGHT_LOGS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 20 AND weight_kg < 350),
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  waist_cm NUMERIC(5,2) NULL,
  arm_cm NUMERIC(5,2) NULL,
  thigh_cm NUMERIC(5,2) NULL,
  chest_cm NUMERIC(5,2) NULL,
  notes TEXT NULL,
  photo_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_weight_log_day UNIQUE (user_id, logged_at)
);

CREATE INDEX IF NOT EXISTS idx_user_weight_logs_user_date ON public.user_weight_logs(user_id, logged_at DESC);


-- =============================================================================
-- 5. RECETTES & INGRÉDIENTS (RECIPES, RECIPE_INGREDIENTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack')),
  target_goal TEXT NOT NULL DEFAULT 'both' CHECK (target_goal IN ('weight_loss', 'muscle_gain', 'both')),
  prep_time_minutes INT NOT NULL DEFAULT 15,
  difficulty TEXT NOT NULL DEFAULT 'Facile' CHECK (difficulty IN ('Facile', 'Moyen', 'Avancé')),
  calories INT NOT NULL CHECK (calories >= 0),
  proteins_g NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (proteins_g >= 0),
  carbs_g NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fats_g NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (fats_g >= 0),
  image_url TEXT NULL,
  instructions TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(6,2) NULL,
  unit TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_category_active ON public.recipes(category, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_recipes_target_goal ON public.recipes(target_goal);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id, display_order);


-- =============================================================================
-- 6. JOURNAL ALIMENTAIRE QUOTIDIEN (USER_DAILY_FOOD_LOGS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_daily_food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id UUID NULL REFERENCES public.recipes(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  serving_size TEXT NULL,
  calories INT NOT NULL CHECK (calories >= 0),
  proteins_g NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (proteins_g >= 0),
  carbs_g NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fats_g NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (fats_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_daily_food_logs_user_date ON public.user_daily_food_logs(user_id, log_date, meal_type);


-- =============================================================================
-- 7. PROGRAMMES D'ENTRAÎNEMENT, SESSIONS & EXERCICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  primary_goal TEXT NOT NULL CHECK (primary_goal IN ('weight_loss', 'muscle_gain', 'both')),
  location TEXT NOT NULL CHECK (location IN ('home', 'gym', 'club', 'hybrid')),
  required_equipment TEXT[] NOT NULL DEFAULT ARRAY['bodyweight']::TEXT[],
  level TEXT NOT NULL DEFAULT 'Tous niveaux' CHECK (level IN ('Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux')),
  sessions_per_week INT NOT NULL DEFAULT 3,
  duration_weeks INT NOT NULL DEFAULT 4,
  cover_image_url TEXT NULL,
  is_kb_shred BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.program_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  is_club_session BOOLEAN NOT NULL DEFAULT FALSE,
  club_discipline_tag TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_program_day UNIQUE (program_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.program_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INT NOT NULL DEFAULT 3,
  reps_or_duration TEXT NOT NULL,
  rest_seconds INT NOT NULL DEFAULT 60,
  instructions TEXT NULL,
  video_url TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_programs_filter ON public.workout_programs(primary_goal, location, level, is_active);
CREATE INDEX IF NOT EXISTS idx_program_sessions_program ON public.program_sessions(program_id, day_number);
CREATE INDEX IF NOT EXISTS idx_program_exercises_session ON public.program_exercises(session_id, display_order);


-- =============================================================================
-- 8. SUIVI DES SÉANCES RÉALISÉES (USER_SESSION_COMPLETIONS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_session_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_session_id UUID NOT NULL REFERENCES public.program_sessions(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NULL,
  CONSTRAINT uq_user_session_completion UNIQUE (user_id, program_session_id, completed_at)
);

CREATE INDEX IF NOT EXISTS idx_user_session_completions_user ON public.user_session_completions(user_id, completed_at DESC);


-- =============================================================================
-- 9. PRIVILÈGES & RLS (SÉCURITÉ STRICTE)
-- =============================================================================

-- Grants universels
GRANT ALL ON TABLE public.nutrition_platform_settings TO postgres, service_role;
GRANT SELECT ON TABLE public.nutrition_platform_settings TO authenticated, anon;
GRANT UPDATE ON TABLE public.nutrition_platform_settings TO authenticated;

GRANT ALL ON TABLE public.user_fitness_profiles TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.user_weight_logs TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.user_daily_food_logs TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.user_session_completions TO postgres, service_role, authenticated;

GRANT ALL ON TABLE public.recipes TO postgres, service_role;
GRANT SELECT ON TABLE public.recipes TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON TABLE public.recipes TO authenticated;

GRANT ALL ON TABLE public.recipe_ingredients TO postgres, service_role;
GRANT SELECT ON TABLE public.recipe_ingredients TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON TABLE public.recipe_ingredients TO authenticated;

GRANT ALL ON TABLE public.workout_programs TO postgres, service_role;
GRANT SELECT ON TABLE public.workout_programs TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON TABLE public.workout_programs TO authenticated;

GRANT ALL ON TABLE public.program_sessions TO postgres, service_role;
GRANT SELECT ON TABLE public.program_sessions TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON TABLE public.program_sessions TO authenticated;

GRANT ALL ON TABLE public.program_exercises TO postgres, service_role;
GRANT SELECT ON TABLE public.program_exercises TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON TABLE public.program_exercises TO authenticated;

-- Activation RLS
ALTER TABLE public.nutrition_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fitness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : nutrition_platform_settings
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "nutrition_settings_select_policy" ON public.nutrition_platform_settings;
CREATE POLICY "nutrition_settings_select_policy" ON public.nutrition_platform_settings
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "nutrition_settings_admin_update_policy" ON public.nutrition_platform_settings;
CREATE POLICY "nutrition_settings_admin_update_policy" ON public.nutrition_platform_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : user_fitness_profiles
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "user_fitness_profiles_select_policy" ON public.user_fitness_profiles;
CREATE POLICY "user_fitness_profiles_select_policy" ON public.user_fitness_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "user_fitness_profiles_insert_policy" ON public.user_fitness_profiles;
CREATE POLICY "user_fitness_profiles_insert_policy" ON public.user_fitness_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "user_fitness_profiles_update_policy" ON public.user_fitness_profiles;
CREATE POLICY "user_fitness_profiles_update_policy" ON public.user_fitness_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : user_weight_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "user_weight_logs_user_policy" ON public.user_weight_logs;
CREATE POLICY "user_weight_logs_user_policy" ON public.user_weight_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : user_daily_food_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "user_daily_food_logs_user_policy" ON public.user_daily_food_logs;
CREATE POLICY "user_daily_food_logs_user_policy" ON public.user_daily_food_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : user_session_completions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "user_session_completions_user_policy" ON public.user_session_completions;
CREATE POLICY "user_session_completions_user_policy" ON public.user_session_completions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : recipes & recipe_ingredients
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "recipes_select_policy" ON public.recipes;
CREATE POLICY "recipes_select_policy" ON public.recipes
  FOR SELECT TO authenticated, anon
  USING ((is_active = true) OR public.is_admin());

DROP POLICY IF EXISTS "recipes_admin_policy" ON public.recipes;
CREATE POLICY "recipes_admin_policy" ON public.recipes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "recipe_ingredients_select_policy" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_select_policy" ON public.recipe_ingredients
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "recipe_ingredients_admin_policy" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_admin_policy" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICIES : workout_programs, program_sessions, program_exercises
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "workout_programs_select_policy" ON public.workout_programs;
CREATE POLICY "workout_programs_select_policy" ON public.workout_programs
  FOR SELECT TO authenticated, anon
  USING ((is_active = true) OR public.is_admin());

DROP POLICY IF EXISTS "workout_programs_admin_policy" ON public.workout_programs;
CREATE POLICY "workout_programs_admin_policy" ON public.workout_programs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "program_sessions_select_policy" ON public.program_sessions;
CREATE POLICY "program_sessions_select_policy" ON public.program_sessions
  FOR SELECT TO authenticated, anon
  USING ((is_active = true) OR public.is_admin());

DROP POLICY IF EXISTS "program_sessions_admin_policy" ON public.program_sessions;
CREATE POLICY "program_sessions_admin_policy" ON public.program_sessions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "program_exercises_select_policy" ON public.program_exercises;
CREATE POLICY "program_exercises_select_policy" ON public.program_exercises
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "program_exercises_admin_policy" ON public.program_exercises;
CREATE POLICY "program_exercises_admin_policy" ON public.program_exercises
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- 10. DONNÉES DE DÉPART (SEED IDEMPOTENT)
-- =============================================================================

-- A. Recettes de départ
INSERT INTO public.recipes (
  id, title, slug, category, target_goal, prep_time_minutes, difficulty,
  calories, proteins_g, carbs_g, fats_g, image_url, instructions, tags, is_premium, is_active, display_order
) VALUES
(
  'e1111111-1111-4111-8111-111111111101',
  'Omelette Striker aux Épinards & Avocat',
  'omelette-striker-epinards-avocat',
  'breakfast',
  'both',
  10,
  'Facile',
  380,
  28.0,
  6.0,
  26.0,
  '/images/recipes/omelette-hero.jpg',
  '1. Battre 3 œufs entiers avec une pincée de sel et poivre.\n2. Faire revenir les épinards 2 min dans une poêle légèrement huilée.\n3. Verser les œufs et cuire à feu moyen jusqu''à consistance baveuse ou cuite selon préférence.\n4. Servir avec 1/4 d''avocat tranché.',
  ARRAY['high_protein', 'quick', 'low_carb']::TEXT[],
  FALSE,
  TRUE,
  1
),
(
  'e1111111-1111-4111-8111-111111111102',
  'Bowl Poulet Rôti, Quinoa & Légumes Croquants',
  'bowl-poulet-quinoa-legumes',
  'lunch',
  'both',
  20,
  'Facile',
  520,
  44.0,
  52.0,
  14.0,
  '/images/recipes/chicken-bowl.jpg',
  '1. Cuire 60g de quinoa dans deux fois son volume d''eau.\n2. Griller 150g d''escalope de poulet émincée avec épices (paprika, cumin, ail).\n3. Couper concombres, tomates cerises et carottes râpées.\n4. Assembler le bol et assaisonner avec un filet de citron et 1 cuillère d''huile d''olive.',
  ARRAY['high_protein', 'balanced']::TEXT[],
  FALSE,
  TRUE,
  2
),
(
  'e1111111-1111-4111-8111-111111111103',
  'Pavé de Saumon Rôti, Patates Douces & Brocolis',
  'saumon-patates-douces-brocolis',
  'dinner',
  'both',
  25,
  'Facile',
  560,
  38.0,
  42.0,
  24.0,
  '/images/recipes/salmon-dinner.jpg',
  '1. Préchauffer le four à 190°C.\n2. Couper 150g de patate douce en cubes et cuire au four 20 min avec sel et herbes de Provence.\n3. Cuire les têtes de brocolis 8 min à la vapeur.\n4. Saisir le pavé de saumon (140g) 3 min côté peau puis 2 min côté chair. Servir chaud.',
  ARRAY['high_protein', 'omega3', 'clean_eating']::TEXT[],
  FALSE,
  TRUE,
  3
),
(
  'e1111111-1111-4111-8111-111111111104',
  'Shaker Récupération Banane, Avoine & Cacao Pur',
  'shaker-recup-banane-avoine-cacao',
  'snack',
  'muscle_gain',
  5,
  'Facile',
  310,
  24.0,
  42.0,
  5.0,
  '/images/recipes/protein-shake.jpg',
  '1. Dans un blender, verser 250ml de lait d''amande ou écrémé.\n2. Ajouter 1 banane mûre, 30g de flocons d''avoine, 1 dose de whey ou protéine végétale (25g) et 1 c.à.c de cacao pur non sucré.\n3. Mixer 45 secondes et consommer idéalement après votre entraînement.',
  ARRAY['quick', 'post_workout', 'muscle_gain']::TEXT[],
  FALSE,
  TRUE,
  4
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  calories = EXCLUDED.calories,
  proteins_g = EXCLUDED.proteins_g,
  carbs_g = EXCLUDED.carbs_g,
  fats_g = EXCLUDED.fats_g,
  instructions = EXCLUDED.instructions,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Ingrédients des recettes
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, display_order)
VALUES
  ('e1111111-1111-4111-8111-111111111101', 'Œufs entiers', 3, 'unité', 1),
  ('e1111111-1111-4111-8111-111111111101', 'Pousses d''épinards frais', 60, 'g', 2),
  ('e1111111-1111-4111-8111-111111111101', 'Avocat', 0.25, 'unité', 3),
  ('e1111111-1111-4111-8111-111111111102', 'Filet de poulet', 150, 'g', 1),
  ('e1111111-1111-4111-8111-111111111102', 'Quinoa cru', 60, 'g', 2),
  ('e1111111-1111-4111-8111-111111111102', 'Tomates cerises & concombre', 100, 'g', 3),
  ('e1111111-1111-4111-8111-111111111103', 'Pavé de saumon frais', 140, 'g', 1),
  ('e1111111-1111-4111-8111-111111111103', 'Patate douce', 150, 'g', 2),
  ('e1111111-1111-4111-8111-111111111103', 'Brocolis', 120, 'g', 3),
  ('e1111111-1111-4111-8111-111111111104', 'Banane mûre', 1, 'unité', 1),
  ('e1111111-1111-4111-8111-111111111104', 'Flocons d''avoine', 30, 'g', 2),
  ('e1111111-1111-4111-8111-111111111104', 'Protéine en poudre (Whey / Végétale)', 25, 'g', 3)
ON CONFLICT DO NOTHING;


-- B. Programmes d'entraînement de départ (avec KB SHRED Hybrid)
INSERT INTO public.workout_programs (
  id, title, slug, description, primary_goal, location, required_equipment,
  level, sessions_per_week, duration_weeks, cover_image_url, is_kb_shred, is_premium, is_active, display_order
) VALUES
(
  'a1111111-1111-4111-8111-111111111101',
  'KB SHRED Protocol — Hybrid Conditioning',
  'kb-shred-protocol-hybrid',
  'Programme signature combinant circuits Kettlebell haute intensité à domicile / salle et créneaux physiques au Striking Camp.',
  'both',
  'hybrid',
  ARRAY['kettlebell', 'bodyweight']::TEXT[],
  'Tous niveaux',
  3,
  4,
  '/images/programs/kb-shred.jpg',
  TRUE,
  FALSE,
  TRUE,
  1
),
(
  'a1111111-1111-4111-8111-111111111102',
  'Striker Conditioning — Maison Poids du Corps',
  'striker-conditioning-maison',
  'Entraînement explosif au poids du corps sans matériel axé sur le cardio combat, l''agilité et la dépense énergétique.',
  'weight_loss',
  'home',
  ARRAY['bodyweight']::TEXT[],
  'Tous niveaux',
  3,
  4,
  '/images/programs/home-bodyweight.jpg',
  FALSE,
  FALSE,
  TRUE,
  2
),
(
  'a1111111-1111-4111-8111-111111111103',
  'Iron Striker — Renforcement & Muscle Gym',
  'iron-striker-renforcement-gym',
  'Programme de prise de masse et de puissance athlétique avec haltères et charges libres pour sportifs de combat.',
  'muscle_gain',
  'gym',
  ARRAY['dumbbells', 'machines']::TEXT[],
  'Intermédiaire',
  4,
  6,
  '/images/programs/gym-hypertrophy.jpg',
  FALSE,
  FALSE,
  TRUE,
  3
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_kb_shred = EXCLUDED.is_kb_shred,
  updated_at = NOW();

-- Sessions des programmes
INSERT INTO public.program_sessions (
  id, program_id, day_number, title, description, duration_minutes, is_club_session, club_discipline_tag, is_active, display_order
) VALUES
  (
    'b1111111-1111-4111-8111-111111111101',
    'a1111111-1111-4111-8111-111111111101',
    1,
    'KB Shred — Kettlebell Swings & Core Blast (Digital)',
    'Séance numérique à la maison ou en salle axée sur la puissance des hanches et la sangle abdominale.',
    40,
    FALSE,
    'KB Shred',
    TRUE,
    1
  ),
  (
    'b1111111-1111-4111-8111-111111111102',
    'a1111111-1111-4111-8111-111111111101',
    2,
    'Séance Club — KB SHRED / Boxing Shred (Physique)',
    'Rendez-vous au club pour une session intense encadrée par le coach Striking Camp.',
    50,
    TRUE,
    'Boxing Shred',
    TRUE,
    2
  ),
  (
    'b1111111-1111-4111-8111-111111111103',
    'a1111111-1111-4111-8111-111111111101',
    3,
    'KB Shred — Clean & Press + Snatch Density (Digital)',
    'Séance numérique axée sur le haut du corps et le conditionnement métabolique.',
    45,
    FALSE,
    'KB Shred',
    TRUE,
    3
  )
ON CONFLICT (program_id, day_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  is_club_session = EXCLUDED.is_club_session,
  club_discipline_tag = EXCLUDED.club_discipline_tag;

-- Exercices de la session 1 (KB Shred Swings & Core)
INSERT INTO public.program_exercises (
  session_id, name, sets, reps_or_duration, rest_seconds, instructions, display_order
) VALUES
  (
    'b1111111-1111-4111-8111-111111111101',
    'Kettlebell Swings (Style Russe)',
    4,
    '20 reps',
    60,
    'Garder le dos droit, engager les fessiers et propulser avec les hanches à hauteur de poitrine.',
    1
  ),
  (
    'b1111111-1111-4111-8111-111111111101',
    'Goblet Squat avec Kettlebell',
    4,
    '12 reps',
    60,
    'Kettlebell tenue contre la poitrine, descendre les hanches sous le niveau des genoux avec contrôle.',
    2
  ),
  (
    'b1111111-1111-4111-8111-111111111101',
    'Russian Twists avec charge',
    3,
    '30 sec',
    45,
    'Pieds décollés du sol, rotation contrôlée du buste de gauche à droite.',
    3
  ),
  (
    'b1111111-1111-4111-8111-111111111101',
    'Burpees Combat sans saut',
    3,
    '10 reps',
    45,
    'Descendre poitrine au sol, remonter en position de garde de boxe.',
    4
  )
ON CONFLICT DO NOTHING;

COMMIT;
