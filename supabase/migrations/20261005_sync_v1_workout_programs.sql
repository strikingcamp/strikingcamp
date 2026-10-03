-- =============================================================================
-- MIGRATION : SYNCHRONISATION OFFICIELLE DES 12 PROGRAMMES ET 36 SESSIONS V1
-- Date : 2026-10-05
-- Description : Synchronise les 12 programmes de référence et leurs 36 sessions V1
--               avec des UUID déterministes et stables pour permettre la persistance
--               réelle des complétions dans public.user_session_completions.
-- =============================================================================

-- 1. INSERTION / MISE À JOUR DES 12 PROGRAMMES V1
INSERT INTO public.workout_programs (
  id,
  title,
  slug,
  description,
  primary_goal,
  location,
  required_equipment,
  level,
  sessions_per_week,
  duration_weeks,
  is_kb_shred,
  is_premium,
  is_active,
  display_order
) VALUES
  -- MAISON — POIDS DU CORPS
  (
    'a1000000-0000-4000-8000-000000000001',
    'FULL BODY 30',
    'full-body-30',
    'Entraînement complet au poids du corps sans matériel. Structuré en blocs de renforcement fonctionnel et d''intervalles métaboliques pour forger l''endurance musculaire.',
    'both',
    'home',
    ARRAY['bodyweight']::TEXT[],
    'Intermédiaire',
    3,
    4,
    FALSE,
    FALSE,
    TRUE,
    1
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'BODYWEIGHT EMOM 20',
    'bodyweight-emom-20',
    'Format EMOM à haute intensité sans matériel. Développe la cadence, la résistance à l''acide lactique et la gestion de l''effort sous fatigue.',
    'both',
    'home',
    ARRAY['bodyweight']::TEXT[],
    'Tous niveaux',
    3,
    3,
    FALSE,
    FALSE,
    TRUE,
    2
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'BODYWEIGHT TABATA CORE 20',
    'bodyweight-tabata-core-20',
    'Protocole Tabata 20s effort / 10s repos ciblant le gainage dynamique, la sangle abdominale profonde et la puissance du tronc.',
    'both',
    'home',
    ARRAY['bodyweight']::TEXT[],
    'Tous niveaux',
    3,
    4,
    FALSE,
    FALSE,
    TRUE,
    3
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'HIIT FOR TIME 25',
    'hiit-for-time-25',
    'Conditioning métabolique For Time sans charge. Complétez chaque tour le plus rapidement possible avec une technique irréprochable.',
    'both',
    'home',
    ARRAY['bodyweight']::TEXT[],
    'Avancé',
    3,
    3,
    FALSE,
    FALSE,
    TRUE,
    4
  ),

  -- MAISON — KETTLEBELL
  (
    'a1000000-0000-4000-8000-000000000005',
    'KB EMOM 25',
    'kb-emom-25',
    'Travail régulier à la minute combinant puissance des hanches et coordination balistique au kettlebell. Rythme strict et intensité maîtrisée.',
    'both',
    'home',
    ARRAY['kettlebell']::TEXT[],
    'Intermédiaire',
    3,
    4,
    FALSE,
    FALSE,
    TRUE,
    5
  ),
  (
    'a1000000-0000-4000-8000-000000000006',
    'KB COMPLEX 25',
    'kb-complex-25',
    'Enchaînements fluides sans lâcher le kettlebell. 5 mouvements combinés par round pour forger l''armure musculaire et le mental athlétique.',
    'both',
    'home',
    ARRAY['kettlebell']::TEXT[],
    'Avancé',
    3,
    4,
    FALSE,
    FALSE,
    TRUE,
    6
  ),
  (
    'a1000000-0000-4000-8000-000000000007',
    'KB AMRAP 20',
    'kb-amrap-20',
    '15 minutes de travail continu au format AMRAP (As Many Rounds As Possible). Gestion de l''effort et maintien de la technique sous fatigue.',
    'both',
    'home',
    ARRAY['kettlebell']::TEXT[],
    'Intermédiaire',
    3,
    4,
    FALSE,
    FALSE,
    TRUE,
    7
  ),
  (
    'a1000000-0000-4000-8000-000000000008',
    'KB FONDATIONS 20',
    'kb-fondations-20',
    'Initiation sécurisée aux mouvements fondamentaux du Kettlebell (Deadlift, Swing, Goblet Squat, Halo). Focus absolu sur la charnière de hanche et l''alignement du dos.',
    'both',
    'home',
    ARRAY['kettlebell']::TEXT[],
    'Débutant',
    3,
    4,
    FALSE,
    FALSE,
    TRUE,
    8
  ),

  -- STRIKING CAMP — KB SHRED (HYBRIDE)
  (
    'a1000000-0000-4000-8000-000000000009',
    'KB SHRED BOXE 30',
    'kb-shred-boxe-30',
    'Fusion signature Kettlebell + Shadow boxing & Frappes. Développe le transfert de force hanche-poing, le cardio combat et le gainage rotationnel.',
    'both',
    'hybrid',
    ARRAY['kettlebell', 'boxing']::TEXT[],
    'Tous niveaux',
    3,
    4,
    TRUE,
    FALSE,
    TRUE,
    9
  ),
  (
    'a1000000-0000-4000-8000-000000000010',
    'KB SHRED FULL BODY 35',
    'kb-shred-full-body-35',
    'Séances complètes associant Kettlebell, Boxe et Poids du corps. Haute dépense calorique et renforcement athlétique global.',
    'both',
    'hybrid',
    ARRAY['kettlebell', 'boxing', 'bodyweight']::TEXT[],
    'Intermédiaire',
    3,
    4,
    TRUE,
    TRUE,
    TRUE,
    10
  ),
  (
    'a1000000-0000-4000-8000-000000000011',
    'KB SHRED EMOM COMBAT 25',
    'kb-shred-emom-combat-25',
    'EMOM hybride alternant rounds balistiques au kettlebell et combinaisons d''explosivité pieds/poings. Gestion lucide du cardio sous fatigue.',
    'both',
    'hybrid',
    ARRAY['kettlebell', 'boxing']::TEXT[],
    'Avancé',
    3,
    3,
    TRUE,
    TRUE,
    TRUE,
    11
  ),
  (
    'a1000000-0000-4000-8000-000000000012',
    'KB SHRED FONDATIONS 25',
    'kb-shred-fondations-25',
    'Initiation aux transitions hybrides : placement du swing, garde de boxe, direct/crochet fondamentaux et gainage fonctionnel.',
    'both',
    'hybrid',
    ARRAY['kettlebell', 'boxing']::TEXT[],
    'Débutant',
    3,
    4,
    TRUE,
    FALSE,
    TRUE,
    12
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  primary_goal = EXCLUDED.primary_goal,
  location = EXCLUDED.location,
  required_equipment = EXCLUDED.required_equipment,
  level = EXCLUDED.level,
  sessions_per_week = EXCLUDED.sessions_per_week,
  duration_weeks = EXCLUDED.duration_weeks,
  is_kb_shred = EXCLUDED.is_kb_shred,
  is_premium = EXCLUDED.is_premium,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();


-- 2. INSERTION / MISE À JOUR DES 36 SESSIONS V1
INSERT INTO public.program_sessions (
  id,
  program_id,
  day_number,
  title,
  description,
  duration_minutes,
  is_club_session,
  club_discipline_tag,
  is_active,
  display_order
) VALUES
  -- 1. FULL BODY 30
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1, 'Séance Fondations & Conditioning', 'Bloc renforcement force fonctionnelle suivi d''un circuit métabolique à haute dépense.', 30, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 2, 'Séance Puissance & Tronc', 'Focus sur le contrôle postural, la chaîne postérieure et la puissance explosive au poids du corps.', 30, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 3, 'Séance Densité & Intervalles', 'Circuits dynamiques axés sur l''endurance musculaire et le travail cardiaque continu.', 30, FALSE, NULL, TRUE, 3),

  -- 2. BODYWEIGHT EMOM 20
  ('b1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 1, 'EMOM Cadence & Bas du Corps', 'Structure EMOM 16 minutes alternant squats, pompes et gainage sous cadence stricte.', 20, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 2, 'EMOM Haut du Corps & Core', 'Poussée, stabilisation scapulaire et gainage dynamique à chaque minute.', 20, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000002', 3, 'EMOM Full Body Finale', 'Combinaison totale des mouvements fonctionnels avec un rythme d''effort soutenu.', 20, FALSE, NULL, TRUE, 3),

  -- 3. BODYWEIGHT TABATA CORE 20
  ('b1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000003', 1, 'Tabata Sangle Abdominale & Obliques', 'Intervalles 20s effort / 10s repos ciblant les abdos profonds et la stabilité lombaire.', 20, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000003', 2, 'Tabata Chaîne Postérieure & Gainage', 'Renforcement des lombaires, fessiers et de la posture globale.', 20, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000003', 3, 'Tabata Cardio Core Élite', 'Combinaison de gainage actif et de pics cardio à très haute intensité.', 20, FALSE, NULL, TRUE, 3),

  -- 4. HIIT FOR TIME 25
  ('b1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000004', 1, 'For Time Défi 4 Tours', '4 tours à terminer le plus rapidement possible avec technique stricte sous chrono.', 25, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000004', 2, 'For Time Échelle Décroissante', 'Format pyramidale 50-40-30-20-10 reps testant la lucidité et la puissance musculaire.', 25, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000012', 'a1000000-0000-4000-8000-000000000004', 3, 'For Time Sprint Final', 'Dernière épreuve d''endurance lactique et de résistance mentale.', 25, FALSE, NULL, TRUE, 3),

  -- 5. KB EMOM 25
  ('b1000000-0000-4000-8000-000000000013', 'a1000000-0000-4000-8000-000000000005', 1, 'KB EMOM Swings & Squats', 'Alternance de swings puissants et de goblet squats sous minute cadencée.', 25, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000014', 'a1000000-0000-4000-8000-000000000005', 2, 'KB EMOM Clean & Press Focus', 'Travail balistique des épaules, du haut du dos et de la stabilité unilatérale.', 25, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000015', 'a1000000-0000-4000-8000-000000000005', 3, 'KB EMOM Snatch & Conditioning', 'Intervalles intenses développant la vitesse de hanche et l''endurance de préhension.', 25, FALSE, NULL, TRUE, 3),

  -- 6. KB COMPLEX 25
  ('b1000000-0000-4000-8000-000000000016', 'a1000000-0000-4000-8000-000000000006', 1, 'Complex Armor Building', 'Swing + Clean + Squat + Press sans lâcher le kettlebell. 5 rounds de pure densité.', 25, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000017', 'a1000000-0000-4000-8000-000000000006', 2, 'Complex Chaîne Postérieure', 'Deadlift + High Pull + Snatch + Fentes arrières.', 25, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000018', 'a1000000-0000-4000-8000-000000000006', 3, 'Complex Métabolique Ultime', 'Combinaison avancée pour tester l''endurance musculaire totale.', 25, FALSE, NULL, TRUE, 3),

  -- 7. KB AMRAP 20
  ('b1000000-0000-4000-8000-000000000019', 'a1000000-0000-4000-8000-000000000007', 1, 'AMRAP Puissance & Cadence', '15 minutes AMRAP : Swings, Goblet Squats, Pompes sur kettlebell et Russian twists.', 20, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000020', 'a1000000-0000-4000-8000-000000000007', 2, 'AMRAP Épaules & Gainage', 'Clean unilatéral, Push press et gainage planche active.', 20, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000021', 'a1000000-0000-4000-8000-000000000007', 3, 'AMRAP Full Body Final', 'Volume total de répétitions sous rythme soutenu et maîtrisé.', 20, FALSE, NULL, TRUE, 3),

  -- 8. KB FONDATIONS 20
  ('b1000000-0000-4000-8000-000000000022', 'a1000000-0000-4000-8000-000000000008', 1, 'Fondations Charnière de Hanche & Swing', 'Apprentissage pas à pas du swing russe et de la poussée des fessiers.', 20, FALSE, NULL, TRUE, 1),
  ('b1000000-0000-4000-8000-000000000023', 'a1000000-0000-4000-8000-000000000008', 2, 'Fondations Squat & Porté (Goblet)', 'Placement du buste, ouverture des hanches et stabilité de la colonne.', 20, FALSE, NULL, TRUE, 2),
  ('b1000000-0000-4000-8000-000000000024', 'a1000000-0000-4000-8000-000000000008', 3, 'Fondations Clean & Press Sécurisé', 'Trajectoire verticale, rack position confortable et poussée stricte.', 20, FALSE, NULL, TRUE, 3),

  -- 9. KB SHRED BOXE 30
  ('b1000000-0000-4000-8000-000000000025', 'a1000000-0000-4000-8000-000000000009', 1, 'KB Swings & Combinaisons Directs', 'Swings balistiques couplés à des rounds de shadow boxing directs/crochets explosifs.', 30, FALSE, 'KB Shred', TRUE, 1),
  ('b1000000-0000-4000-8000-000000000026', 'a1000000-0000-4000-8000-000000000009', 2, 'KB Clean + Uppercuts & Esquives', 'Transfert de force hanches vers le haut du corps et mobilité de buste.', 30, FALSE, 'KB Shred', TRUE, 2),
  ('b1000000-0000-4000-8000-000000000027', 'a1000000-0000-4000-8000-000000000009', 3, 'KB Snatch & Cardio Combat Rounds', 'Rounds de boxe intensifs et puissance dynamique continue.', 30, FALSE, 'KB Shred', TRUE, 3),

  -- 10. KB SHRED FULL BODY 35
  ('b1000000-0000-4000-8000-000000000028', 'a1000000-0000-4000-8000-000000000010', 1, 'Full Body Shred — Puissance & Frappe', 'Circuits alternant Kettlebell Goblet Squat, Shadow explosif et Pompes rapides.', 35, FALSE, 'KB Shred', TRUE, 1),
  ('b1000000-0000-4000-8000-000000000029', 'a1000000-0000-4000-8000-000000000010', 2, 'Full Body Shred — Chaîne Postérieure & Esquives', 'Swings, déplacements latéraux de boxe et gainage dynamique.', 35, FALSE, 'KB Shred', TRUE, 2),
  ('b1000000-0000-4000-8000-000000000030', 'a1000000-0000-4000-8000-000000000010', 3, 'Full Body Shred — Densité Totale', 'Circuits 3 univers combinant Kettlebell, Boxe et Poids du corps.', 35, FALSE, 'KB Shred', TRUE, 3),

  -- 11. KB SHRED EMOM COMBAT 25
  ('b1000000-0000-4000-8000-000000000031', 'a1000000-0000-4000-8000-000000000011', 1, 'EMOM Combat — Puissance de Frappe', 'EMOM 16 min : Minute 1 Swings, Minute 2 Combinaison Boxe, Minute 3 Gainage.', 25, FALSE, 'KB Shred', TRUE, 1),
  ('b1000000-0000-4000-8000-000000000032', 'a1000000-0000-4000-8000-000000000011', 2, 'EMOM Combat — Vitesse & Récupération', 'Enchaînements rapides avec temps de repos décroissant.', 25, FALSE, 'KB Shred', TRUE, 2),
  ('b1000000-0000-4000-8000-000000000033', 'a1000000-0000-4000-8000-000000000011', 3, 'EMOM Combat — Champion Rounds', 'Rounds finaux à cadence maximale pour forger le mental de combat.', 25, FALSE, 'KB Shred', TRUE, 3),

  -- 12. KB SHRED FONDATIONS 25
  ('b1000000-0000-4000-8000-000000000034', 'a1000000-0000-4000-8000-000000000012', 1, 'Initiation Hybride — Swing & Garde de Boxe', 'Coordination entre l''ancrage au sol et la posture de frappe sécurisée.', 25, FALSE, 'KB Shred', TRUE, 1),
  ('b1000000-0000-4000-8000-000000000035', 'a1000000-0000-4000-8000-000000000012', 2, 'Initiation Hybride — Squat & Directs', 'Synchronisation de la poussée des jambes avec la trajectoire des poings.', 25, FALSE, 'KB Shred', TRUE, 2),
  ('b1000000-0000-4000-8000-000000000036', 'a1000000-0000-4000-8000-000000000012', 3, 'Initiation Hybride — Circuit Découverte 3 Univers', 'Enchaînement guidé doux pour consolider les bases hybrides.', 25, FALSE, 'KB Shred', TRUE, 3)
ON CONFLICT (id) DO UPDATE SET
  program_id = EXCLUDED.program_id,
  day_number = EXCLUDED.day_number,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  is_club_session = EXCLUDED.is_club_session,
  club_discipline_tag = EXCLUDED.club_discipline_tag,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;
