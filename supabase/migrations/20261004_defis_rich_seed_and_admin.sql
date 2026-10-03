-- =============================================================================
-- Migration : 20261004_defis_rich_seed_and_admin.sql
-- Description : Enrichissement complet du catalogue (30 recettes sportives + 107 ingrédients,
--               8+ programmes d'entraînement maison/salle/KB SHRED avec sessions et exercices)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CATALOGUE ENRICHI DE 30 RECETTES CERTIFIÉES STRIKING CAMP
-- =============================================================================

-- A. RECETTES PERTE DE POIDS (10 recettes)
INSERT INTO public.recipes (
  id, title, slug, category, target_goal, prep_time_minutes, difficulty,
  calories, proteins_g, carbs_g, fats_g, image_url, instructions, tags, is_premium, is_active, display_order
) VALUES
(
  'c1000000-0000-4000-8000-000000000001',
  'Salade Thaï au Bœuf Saisi & Citronnelle',
  'salade-thai-boeuf-saisi',
  'lunch',
  'weight_loss',
  15,
  'Facile',
  360,
  38.0,
  12.0,
  16.0,
  '/images/recipes/thai-beef-salad.jpg',
  '1. Émincer 150g de bavette ou rumsteak.\n2. Saisir la viande à feu très vif 1 min par face dans une poêle antiadhésive.\n3. Préparer le lit de salade : pousses d''épinards, concombre, coriandre fraîche, menthe et oignon rouge émincé.\n4. Assaisonner avec jus de citron vert, 1 c.à.s de sauce soja légère et piment d''Espelette.\n5. Déposer le bœuf chaud sur la salade croquante et servir immédiatement.',
  ARRAY['high_protein', 'low_carb', 'quick']::TEXT[],
  FALSE,
  TRUE,
  10
),
(
  'c1000000-0000-4000-8000-000000000002',
  'Pavé de Cabillaud Rôti aux Courgettes & Épices Douces',
  'cabillaud-roti-courgettes',
  'dinner',
  'weight_loss',
  20,
  'Facile',
  310,
  36.0,
  10.0,
  12.0,
  '/images/recipes/cod-zucchini.jpg',
  '1. Préchauffer le four à 180°C.\n2. Couper 2 courgettes moyennes en rondelles et les disposer dans un plat avec un filet d''huile d''olive et du thym.\n3. Déposer 160g de dos de cabillaud assaisonné de curcuma, sel et poivre.\n4. Enfourner 18 min. Servir avec un jus de citron frais.',
  ARRAY['high_protein', 'low_carb', 'clean_eating']::TEXT[],
  FALSE,
  TRUE,
  11
),
(
  'c1000000-0000-4000-8000-000000000003',
  'Omelette Blanche aux Blancs d''Œufs, Tomates & Basilic',
  'omelette-blanche-tomates-basilic',
  'breakfast',
  'weight_loss',
  10,
  'Facile',
  220,
  30.0,
  6.0,
  7.0,
  '/images/recipes/egg-white-omelette.jpg',
  '1. Mélanger 4 blancs d''œufs et 1 œuf entier avec sel et poivre.\n2. Faire suer 1 tomate coupée en dés dans une poêle chaude.\n3. Verser les œufs et cuire 4 minutes à feu moyen.\n4. Parsemer de basilic frais ciselé avant de plier l''omelette.',
  ARRAY['high_protein', 'low_carb', 'quick']::TEXT[],
  FALSE,
  TRUE,
  12
),
(
  'c1000000-0000-4000-8000-000000000004',
  'Wraps Protéinés Thon Nature & Crudités Croquantes',
  'wraps-protein-thon-crudites',
  'lunch',
  'weight_loss',
  10,
  'Facile',
  340,
  35.0,
  28.0,
  8.0,
  '/images/recipes/tuna-wrap.jpg',
  '1. Émietter une boîte de 140g de thon au naturel.\n2. Mélanger avec 1 c.à.s de fromage blanc 0%, ciboulette et jus de citron.\n3. Garnir une galette de wrap complète avec feuilles de batavia, carotte râpée et tomates.\n4. Rouler fermement et trancher en deux.',
  ARRAY['high_protein', 'quick']::TEXT[],
  FALSE,
  TRUE,
  13
),
(
  'c1000000-0000-4000-8000-000000000005',
  'Soupe Brûle-Graisses Striker Poulet & Gingembre',
  'soupe-poulet-gingembre',
  'dinner',
  'weight_loss',
  25,
  'Facile',
  290,
  34.0,
  14.0,
  8.0,
  '/images/recipes/ginger-chicken-soup.jpg',
  '1. Porter à ébullition 500ml de bouillon de volaille dégraissé avec 1 c.à.c de gingembre frais râpé et 1 gousse d''ail.\n2. Ajouter 150g d''escalope de poulet émincée et 150g de légumes verts (courgettes, chou chinois, haricots verts).\n3. Laisser mijoter 15 min à feu doux.\n4. Servir très chaud parsemé de coriandre.',
  ARRAY['high_protein', 'low_carb']::TEXT[],
  FALSE,
  TRUE,
  14
),
(
  'c1000000-0000-4000-8000-000000000006',
  'Tartare de Saumon Frais & Avocat Light',
  'tartare-saumon-avocat',
  'dinner',
  'weight_loss',
  15,
  'Moyen',
  380,
  32.0,
  8.0,
  24.0,
  '/images/recipes/salmon-tartare.jpg',
  '1. Couper 130g de saumon ultra-frais en petits dés réguliers.\n2. Couper 1/3 d''avocat en dés et mélanger délicatement.\n3. Assaisonner avec jus de citron vert, aneth ciselée, fleur de sel et baies roses.\n4. Dresser dans un emporte-pièce sur un lit de roquette.',
  ARRAY['high_protein', 'omega3', 'low_carb']::TEXT[],
  TRUE,
  TRUE,
  15
),
(
  'c1000000-0000-4000-8000-000000000007',
  'Émincé de Dinde au Curry Doux & Haricots Verts',
  'emince-dinde-curry-haricots',
  'lunch',
  'weight_loss',
  20,
  'Facile',
  350,
  42.0,
  12.0,
  12.0,
  '/images/recipes/curry-turkey.jpg',
  '1. Dorer 160g de filet de dinde en dés dans 1 c.à.c d''huile d''olive.\n2. Ajouter 1 c.à.s de poudre de curry et 2 c.à.s de lait de coco allégé.\n3. Incorporer 200g de haricots verts cuits à la vapeur.\n4. Mélanger 3 min pour bien napper et servir chaud.',
  ARRAY['high_protein', 'low_carb']::TEXT[],
  FALSE,
  TRUE,
  16
),
(
  'c1000000-0000-4000-8000-000000000008',
  'Poêlée de Crevettes à l''Ail & Brocolis Croquants',
  'poelee-crevettes-ail-brocolis',
  'dinner',
  'weight_loss',
  15,
  'Facile',
  280,
  36.0,
  10.0,
  9.0,
  '/images/recipes/garlic-shrimp-broccoli.jpg',
  '1. Cuire 200g de têtes de brocolis 4 min à l''eau bouillante (doivent rester croquants).\n2. Dans une poêle antiadhésive, faire revenir 180g de grosses crevettes décortiquées avec 2 gousses d''ail écrasées.\n3. Ajouter les brocolis égouttés, saler, poivrer et faire sauter 3 minutes.',
  ARRAY['high_protein', 'low_carb', 'quick']::TEXT[],
  FALSE,
  TRUE,
  17
),
(
  'c1000000-0000-4000-8000-000000000009',
  'Bowl Fromage Blanc 0%, Graines de Chia & Myrtilles',
  'bowl-fromage-blanc-chia-myrtilles',
  'snack',
  'weight_loss',
  5,
  'Facile',
  210,
  24.0,
  14.0,
  4.0,
  '/images/recipes/chia-berry-bowl.jpg',
  '1. Verser 250g de fromage blanc 0% dans un bol.\n2. Ajouter 1 c.à.s de graines de chia et une poignée de myrtilles fraîches (50g).\n3. Saupoudrer d''une pointe de cannelle.',
  ARRAY['high_protein', 'quick', 'low_carb']::TEXT[],
  FALSE,
  TRUE,
  18
),
(
  'c1000000-0000-4000-8000-000000000010',
  'Carpaccio de Bœuf, Roquette & Filet d''Huile d''Olive',
  'carpaccio-boeuf-roquette',
  'dinner',
  'weight_loss',
  10,
  'Facile',
  310,
  34.0,
  3.0,
  18.0,
  '/images/recipes/beef-carpaccio.jpg',
  '1. Disposer 160g de fines tranches de bœuf charolais sur une assiette froide.\n2. Recouvrir d''un lit de roquette sauvage fraîche.\n3. Arroser d''un filet d''huile d''olive extra-vierge (1 c.à.s), de jus de citron et de quelques copeaux de parmesan (10g).',
  ARRAY['high_protein', 'low_carb', 'quick']::TEXT[],
  TRUE,
  TRUE,
  19
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  calories = EXCLUDED.calories,
  proteins_g = EXCLUDED.proteins_g,
  carbs_g = EXCLUDED.carbs_g,
  fats_g = EXCLUDED.fats_g,
  instructions = EXCLUDED.instructions,
  tags = EXCLUDED.tags,
  is_premium = EXCLUDED.is_premium,
  updated_at = NOW();

-- B. RECETTES GAIN MUSCULAIRE (10 recettes)
INSERT INTO public.recipes (
  id, title, slug, category, target_goal, prep_time_minutes, difficulty,
  calories, proteins_g, carbs_g, fats_g, image_url, instructions, tags, is_premium, is_active, display_order
) VALUES
(
  'c2000000-0000-4000-8000-000000000001',
  'Steak Haché 5% & Patates Douces Rôties au Four',
  'steak-patates-douces-roties',
  'lunch',
  'muscle_gain',
  25,
  'Facile',
  620,
  46.0,
  64.0,
  18.0,
  '/images/recipes/beef-sweet-potato.jpg',
  '1. Préchauffer le four à 200°C.\n2. Couper 250g de patate douce en frites épaisses, assaisonner avec 1 c.à.s d''huile d''olive, paprika et sel, enfourner 20 min.\n3. Griller un steak haché pur bœuf 5% (170g) à la poêle selon cuisson désirée.\n4. Servir chaud avec une portion de haricots verts.',
  ARRAY['high_protein', 'muscle_gain', 'balanced']::TEXT[],
  FALSE,
  TRUE,
  20
),
(
  'c2000000-0000-4000-8000-000000000002',
  'Pâtes Complètes au Bœuf Haché & Sauce Tomate Basilic',
  'pates-completes-boeuf-tomate',
  'dinner',
  'muscle_gain',
  20,
  'Facile',
  680,
  48.0,
  78.0,
  16.0,
  '/images/recipes/pasta-bolognese.jpg',
  '1. Cuire 90g de pâtes complètes (penne ou tagliatelles) al dente.\n2. Faire revenir 160g de bœuf haché 5% avec 1 oignon émincé.\n3. Ajouter 200g de coulis de tomates concassées, origan et basilic, laisser mijoter 8 min.\n4. Mélanger les pâtes égouttées à la sauce bolognaise maison.',
  ARRAY['high_protein', 'muscle_gain']::TEXT[],
  FALSE,
  TRUE,
  21
),
(
  'c2000000-0000-4000-8000-000000000003',
  'Poulet Façon Basquaise & Riz Brun Complet',
  'poulet-basquaise-riz-brun',
  'lunch',
  'muscle_gain',
  30,
  'Moyen',
  590,
  44.0,
  62.0,
  16.0,
  '/images/recipes/chicken-basquaise.jpg',
  '1. Cuire 80g de riz brun complet.\n2. Dans une sauteuse, faire dorer 160g de blanc de poulet émincé.\n3. Ajouter 1 poivron rouge et 1 poivron vert émincés, 1 tomate et du piment doux.\n4. Laisser mijoter 15 min à couvert et napper sur le riz chaud.',
  ARRAY['high_protein', 'muscle_gain']::TEXT[],
  FALSE,
  TRUE,
  22
),
(
  'c2000000-0000-4000-8000-000000000004',
  'Shaker Mass & Recovery Avoine, Banane & Whey',
  'shaker-mass-recovery-avoine-banane',
  'snack',
  'muscle_gain',
  5,
  'Facile',
  490,
  38.0,
  65.0,
  8.0,
  '/images/recipes/mass-shake.jpg',
  '1. Dans un blender, verser 300ml de lait demi-écrémé ou végétal.\n2. Ajouter 50g de farine d''avoine instantanée, 1 banane bien mûre et 35g de whey protéine vanille ou chocolat.\n3. Mixer 30 secondes et boire dans l''heure suivant l''entraînement de combat ou musculation.',
  ARRAY['high_protein', 'muscle_gain', 'post_workout', 'quick']::TEXT[],
  FALSE,
  TRUE,
  23
),
(
  'c2000000-0000-4000-8000-000000000005',
  'Pavé de Saumon Entier & Riz Basmati Sauvage',
  'saumon-entier-riz-basmati',
  'dinner',
  'muscle_gain',
  25,
  'Facile',
  640,
  42.0,
  58.0,
  26.0,
  '/images/recipes/salmon-rice.jpg',
  '1. Cuire 80g de mélange riz basmati et riz sauvage.\n2. Saisir 160g de pavé de saumon frais à la poêle 4 min côté peau puis 3 min côté chair.\n3. Servir avec des asperges ou haricots vapeur et un trait de sauce soja.',
  ARRAY['high_protein', 'omega3', 'muscle_gain']::TEXT[],
  FALSE,
  TRUE,
  24
),
(
  'c2000000-0000-4000-8000-000000000006',
  'Omelette 4 Œufs, Flocons d''Avoine & Épinards',
  'omelette-avoine-epinards-muscles',
  'breakfast',
  'muscle_gain',
  12,
  'Facile',
  510,
  36.0,
  38.0,
  22.0,
  '/images/recipes/oat-omelette.jpg',
  '1. Battre 3 œufs entiers + 2 blancs d''œufs avec 40g de petits flocons d''avoine.\n2. Laisser gonfler 3 minutes.\n3. Faire revenir une poignée d''épinards frais dans une poêle, verser la préparation et cuire à feu moyen 4 min de chaque côté.',
  ARRAY['high_protein', 'muscle_gain', 'power_breakfast']::TEXT[],
  FALSE,
  TRUE,
  25
),
(
  'c2000000-0000-4000-8000-000000000007',
  'Chili Con Carne Striker Extra Protéines',
  'chili-con-carne-striker',
  'lunch',
  'muscle_gain',
  25,
  'Facile',
  650,
  52.0,
  68.0,
  16.0,
  '/images/recipes/chili-striker.jpg',
  '1. Faire dorer 180g de bœuf haché 5% avec ail et oignon.\n2. Ajouter 150g de haricots rouges égouttés, 150g de tomates concassées, maïs doux et épices chili.\n3. Laisser mijoter 12 min pour épaissir la sauce. Servir avec 50g de riz blanc.',
  ARRAY['high_protein', 'muscle_gain']::TEXT[],
  TRUE,
  TRUE,
  26
),
(
  'c2000000-0000-4000-8000-000000000008',
  'Risotto d''Épeautre au Poulet & Champignons Bruns',
  'risotto-epeautre-poulet-champignons',
  'dinner',
  'muscle_gain',
  30,
  'Moyen',
  580,
  46.0,
  62.0,
  14.0,
  '/images/recipes/spelt-risotto.jpg',
  '1. Faire revenir 80g de petit épeautre dans 1 c.à.c d''huile avec échalote.\n2. Mouiller progressivement avec du bouillon chaud pendant 20 min.\n3. Poêler 160g de poulet en dés avec 150g de champignons de Paris émincés.\n4. Assembler et ajouter 1 c.à.s de parmesan râpé.',
  ARRAY['high_protein', 'muscle_gain']::TEXT[],
  TRUE,
  TRUE,
  27
),
(
  'c2000000-0000-4000-8000-000000000009',
  'Bowl Porridge Énergétique Beurre de Cacahuète & Banane',
  'porridge-beurre-cacahuete-banane',
  'breakfast',
  'muscle_gain',
  8,
  'Facile',
  530,
  28.0,
  68.0,
  18.0,
  '/images/recipes/peanut-butter-porridge.jpg',
  '1. Chauffer 60g de flocons d''avoine avec 200ml de lait dans une casserole 4 min.\n2. Hors du feu, incorporer 20g de whey protéine et 1 c.à.s généreuse de beurre de cacahuète 100% pur.\n3. Déposer 1 banane tranchée sur le dessus et déguster chaud.',
  ARRAY['high_protein', 'muscle_gain', 'quick']::TEXT[],
  FALSE,
  TRUE,
  28
),
(
  'c2000000-0000-4000-8000-000000000010',
  'Filet Mignon de Porc Rôti & Purée Maison de Patates Douces',
  'filet-mignon-puree-patates-douces',
  'dinner',
  'muscle_gain',
  30,
  'Moyen',
  590,
  45.0,
  55.0,
  19.0,
  '/images/recipes/pork-sweet-potato.jpg',
  '1. Cuire 250g de patate douce à la vapeur puis écraser à la fourchette avec sel et muscade.\n2. Saisir 180g de médaillons de filet mignon à la poêle 3 min par face avec du romarin frais.\n3. Servir les médaillons rosés nappés de leur jus sur la purée chaude.',
  ARRAY['high_protein', 'muscle_gain']::TEXT[],
  TRUE,
  TRUE,
  29
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  calories = EXCLUDED.calories,
  proteins_g = EXCLUDED.proteins_g,
  carbs_g = EXCLUDED.carbs_g,
  fats_g = EXCLUDED.fats_g,
  instructions = EXCLUDED.instructions,
  tags = EXCLUDED.tags,
  is_premium = EXCLUDED.is_premium,
  updated_at = NOW();

-- C. RECETTES COMPATIBLES AVEC LES DEUX OBJECTIFS / RECOMPOSITION (10 recettes)
INSERT INTO public.recipes (
  id, title, slug, category, target_goal, prep_time_minutes, difficulty,
  calories, proteins_g, carbs_g, fats_g, image_url, instructions, tags, is_premium, is_active, display_order
) VALUES
(
  'c3000000-0000-4000-8000-000000000001',
  'Salade Complète Quinoa, Poulet Grillé & Féta AOP',
  'salade-quinoa-poulet-feta',
  'lunch',
  'both',
  15,
  'Facile',
  460,
  40.0,
  38.0,
  16.0,
  '/images/recipes/quinoa-chicken-feta.jpg',
  '1. Mélanger 50g de quinoa cuit avec concombre en dés, tomates cerises et menthe.\n2. Ajouter 150g d''escalope de poulet grillée en lamelles.\n3. Émietter 30g de féta grecque AOP et assaisonner avec 1 c.à.c d''huile d''olive et citron.',
  ARRAY['high_protein', 'balanced', 'quick']::TEXT[],
  FALSE,
  TRUE,
  30
),
(
  'c3000000-0000-4000-8000-000000000002',
  'Bowl Burrito Healthy Haricots Noirs, Dinde & Guacamole',
  'bowl-burrito-healthy-dinde',
  'lunch',
  'both',
  20,
  'Facile',
  490,
  42.0,
  45.0,
  15.0,
  '/images/recipes/burrito-bowl.jpg',
  '1. Dans un bol, déposer 50g de riz basmati et 80g de haricots noirs rincés.\n2. Ajouter 150g de blanc de dinde sauté aux épices mexicaines (paprika, origan, cumin).\n3. Compléter avec 1/4 d''avocat écrasé en guacamole minute, maïs et coriandre fraîche.',
  ARRAY['high_protein', 'balanced']::TEXT[],
  FALSE,
  TRUE,
  31
),
(
  'c3000000-0000-4000-8000-000000000003',
  'Blanc de Poulet Façon Yakitori & Légumes Croquants',
  'poulet-yakitori-legumes-croquants',
  'dinner',
  'both',
  20,
  'Facile',
  440,
  42.0,
  36.0,
  12.0,
  '/images/recipes/chicken-yakitori.jpg',
  '1. Couper 160g de poulet en cubes et faire mariner 10 min dans 1 c.à.s de sauce soja et 1 c.à.c de miel.\n2. Saisir les brochettes de poulet 6 min à la poêle.\n3. Servir avec un wok de carottes, pois gourmands et chou blanc sautés à l''huile de sésame.',
  ARRAY['high_protein', 'balanced']::TEXT[],
  FALSE,
  TRUE,
  32
),
(
  'c3000000-0000-4000-8000-000000000004',
  'Wok de Bœuf Sauté aux Légumes Asiatiques & Noix de Cajou',
  'wok-boeuf-legumes-cajou',
  'dinner',
  'both',
  18,
  'Facile',
  480,
  40.0,
  32.0,
  20.0,
  '/images/recipes/beef-wok-cashew.jpg',
  '1. Émincer 150g de bœuf maigre.\n2. Dans un wok très chaud, faire sauter 2 min le bœuf puis réserver.\n3. Faire sauter poivrons, oignon et pousses de soja 4 min.\n4. Réunir viande et légumes avec 1 c.à.s de sauce soja et parsemer de 15g de noix de cajou concassées.',
  ARRAY['high_protein', 'balanced']::TEXT[],
  TRUE,
  TRUE,
  33
),
(
  'c3000000-0000-4000-8000-000000000005',
  'Smoothie Vert Combat Spiruline, Banane & Protéine',
  'smoothie-vert-combat-spiruline',
  'snack',
  'both',
  5,
  'Facile',
  260,
  25.0,
  32.0,
  3.0,
  '/images/recipes/green-combat-smoothie.jpg',
  '1. Dans un blender, mettre 1 poignée de jeunes pousses d''épinards, 1/2 banane, 200ml d''eau de coco.\n2. Ajouter 25g de protéine végétale ou whey neutre et 1 c.à.c de spiruline pure.\n3. Mixer à haute vitesse 45 secondes. Boisson revitalisante pour sportifs.',
  ARRAY['high_protein', 'quick', 'superfood']::TEXT[],
  FALSE,
  TRUE,
  34
),
(
  'c3000000-0000-4000-8000-000000000006',
  'Filet de Dinde Mariné Citron & Riz Basmati Parfumé',
  'dinde-marinee-citron-riz',
  'lunch',
  'both',
  20,
  'Facile',
  450,
  44.0,
  48.0,
  9.0,
  '/images/recipes/lemon-turkey-rice.jpg',
  '1. Faire mariner 160g de filet de dinde avec le jus d''un demi-citron, ail écrasé et thym.\n2. Cuire 60g de riz basmati.\n3. Griller la dinde 3 min de chaque côté.\n4. Servir avec une belle poignée de haricots verts frais.',
  ARRAY['high_protein', 'clean_eating', 'balanced']::TEXT[],
  FALSE,
  TRUE,
  35
),
(
  'c3000000-0000-4000-8000-000000000007',
  'Pancakes Protéinés Avoine, Œufs & Myrtilles',
  'pancakes-proteines-avoine-myrtilles',
  'breakfast',
  'both',
  12,
  'Facile',
  380,
  30.0,
  42.0,
  8.0,
  '/images/recipes/protein-pancakes.jpg',
  '1. Mixer 40g de flocons d''avoine, 2 œufs entiers, 1 blanc d''œuf et 1 c.à.c de levure.\n2. Cuire 3 petits pancakes dans une poêle antiadhésive huilée 1 min 30 par face.\n3. Garnir de 40g de myrtilles fraîches et d''un trait de sirop d''agave.',
  ARRAY['high_protein', 'quick', 'power_breakfast']::TEXT[],
  FALSE,
  TRUE,
  36
),
(
  'c3000000-0000-4000-8000-000000000008',
  'Pavé de Thon Mi-Cuit au Sésame & Haricots Plats',
  'thon-mi-cuit-sesame',
  'dinner',
  'both',
  15,
  'Moyen',
  430,
  44.0,
  14.0,
  18.0,
  '/images/recipes/seared-tuna.jpg',
  '1. Enrober un pavé de thon frais (150g) de graines de sésame blanc et noir.\n2. Saisir 1 minute sur chaque face dans une poêle très chaude (le cœur doit rester cru et rouge).\n3. Trancher en tataki et accompagner de haricots plats cuits à la vapeur.',
  ARRAY['high_protein', 'omega3', 'quick']::TEXT[],
  TRUE,
  TRUE,
  37
),
(
  'c3000000-0000-4000-8000-000000000009',
  'Cottage Cheese Protéiné aux Noix & Pomme Râpée',
  'cottage-cheese-noix-pomme',
  'snack',
  'both',
  5,
  'Facile',
  270,
  24.0,
  22.0,
  9.0,
  '/images/recipes/cottage-cheese-bowl.jpg',
  '1. Verser 200g de cottage cheese (ou fromage blanc de campagne) dans un bol.\n2. Râper 1/2 pomme verte Granny Smith sur le dessus.\n3. Parsemer de 10g de cerneaux de noix concassés et d''une pincée de cannelle.',
  ARRAY['high_protein', 'quick']::TEXT[],
  FALSE,
  TRUE,
  38
),
(
  'c3000000-0000-4000-8000-000000000010',
  'Curry de Pois Chiches, Épinards & Poulet Émincé',
  'curry-pois-chiches-epinards-poulet',
  'lunch',
  'both',
  20,
  'Facile',
  490,
  42.0,
  46.0,
  14.0,
  '/images/recipes/chickpea-chicken-curry.jpg',
  '1. Faire revenir 150g d''escalope de poulet émincée dans 1 c.à.c d''huile d''olive avec ail et gingembre.\n2. Ajouter 100g de pois chiches cuits, 100g de pousses d''épinards et 100ml de coulis de tomate épicé au curry.\n3. Laisser compoter 8 min. Servir avec une tranche de pain complet ou 40g de riz.',
  ARRAY['high_protein', 'balanced']::TEXT[],
  FALSE,
  TRUE,
  39
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  calories = EXCLUDED.calories,
  proteins_g = EXCLUDED.proteins_g,
  carbs_g = EXCLUDED.carbs_g,
  fats_g = EXCLUDED.fats_g,
  instructions = EXCLUDED.instructions,
  tags = EXCLUDED.tags,
  is_premium = EXCLUDED.is_premium,
  updated_at = NOW();


-- Ingrédients détaillés pour le catalogue des 30 recettes
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, display_order)
VALUES
  -- 1. Salade Thaï au Bœuf Saisi
  ('c1000000-0000-4000-8000-000000000001', 'Bavette ou rumsteak de bœuf', 150, 'g', 1),
  ('c1000000-0000-4000-8000-000000000001', 'Pousses d''épinards frais', 80, 'g', 2),
  ('c1000000-0000-4000-8000-000000000001', 'Concombre & oignon rouge', 100, 'g', 3),
  ('c1000000-0000-4000-8000-000000000001', 'Jus de citron vert & coriandre', 1, 'portion', 4),

  -- 2. Pavé de Cabillaud Rôti
  ('c1000000-0000-4000-8000-000000000002', 'Dos de cabillaud frais', 160, 'g', 1),
  ('c1000000-0000-4000-8000-000000000002', 'Courgettes moyennes', 2, 'unités', 2),
  ('c1000000-0000-4000-8000-000000000002', 'Huile d''olive & thym frais', 1, 'c.à.s', 3),

  -- 3. Omelette Blanche
  ('c1000000-0000-4000-8000-000000000003', 'Blancs d''œufs', 4, 'unités', 1),
  ('c1000000-0000-4000-8000-000000000003', 'Œuf entier', 1, 'unité', 2),
  ('c1000000-0000-4000-8000-000000000003', 'Tomate fraîche & basilic', 1, 'unité', 3),

  -- 4. Wraps Protéinés Thon
  ('c1000000-0000-4000-8000-000000000004', 'Thon blanc au naturel égoutté', 140, 'g', 1),
  ('c1000000-0000-4000-8000-000000000004', 'Galette wrap de blé complet', 1, 'unité', 2),
  ('c1000000-0000-4000-8000-000000000004', 'Fromage blanc 0% & crudités', 50, 'g', 3),

  -- 5. Soupe Brûle-Graisses Poulet & Gingembre
  ('c1000000-0000-4000-8000-000000000005', 'Escalope de poulet émincée', 150, 'g', 1),
  ('c1000000-0000-4000-8000-000000000005', 'Bouillon de volaille dégraissé', 500, 'ml', 2),
  ('c1000000-0000-4000-8000-000000000005', 'Légumes verts émincés & gingembre', 150, 'g', 3),

  -- 6. Tartare de Saumon Frais
  ('c1000000-0000-4000-8000-000000000006', 'Saumon frais qualité tartare', 130, 'g', 1),
  ('c1000000-0000-4000-8000-000000000006', 'Avocat mûr', 0.33, 'unité', 2),
  ('c1000000-0000-4000-8000-000000000006', 'Aneth fraîche & citron vert', 1, 'portion', 3),

  -- 7. Émincé de Dinde au Curry
  ('c1000000-0000-4000-8000-000000000007', 'Filet de dinde', 160, 'g', 1),
  ('c1000000-0000-4000-8000-000000000007', 'Haricots verts extra-fins', 200, 'g', 2),
  ('c1000000-0000-4000-8000-000000000007', 'Lait de coco allégé & curry', 2, 'c.à.s', 3),

  -- 8. Poêlée de Crevettes & Brocolis
  ('c1000000-0000-4000-8000-000000000008', 'Crevettes roses décortiquées', 180, 'g', 1),
  ('c1000000-0000-4000-8000-000000000008', 'Têtes de brocolis frais', 200, 'g', 2),
  ('c1000000-0000-4000-8000-000000000008', 'Gousses d''ail écrasées', 2, 'gousses', 3),

  -- 9. Bowl Fromage Blanc & Myrtilles
  ('c1000000-0000-4000-8000-000000000009', 'Fromage blanc 0%', 250, 'g', 1),
  ('c1000000-0000-4000-8000-000000000009', 'Myrtilles fraîches', 50, 'g', 2),
  ('c1000000-0000-4000-8000-000000000009', 'Graines de chia', 1, 'c.à.s', 3),

  -- 10. Carpaccio de Bœuf & Roquette
  ('c1000000-0000-4000-8000-000000000010', 'Tranches fines de bœuf charolais', 160, 'g', 1),
  ('c1000000-0000-4000-8000-000000000010', 'Roquette sauvage fraîche', 60, 'g', 2),
  ('c1000000-0000-4000-8000-000000000010', 'Copeaux de parmesan AOP & huile d''olive', 10, 'g', 3),

  -- 11. Steak Haché 5% & Patates Douces
  ('c2000000-0000-4000-8000-000000000001', 'Steak haché pur bœuf 5%', 170, 'g', 1),
  ('c2000000-0000-4000-8000-000000000001', 'Patate douce crue', 250, 'g', 2),
  ('c2000000-0000-4000-8000-000000000001', 'Huile d''olive & paprika fumé', 1, 'c.à.s', 3),

  -- 12. Pâtes Complètes au Bœuf
  ('c2000000-0000-4000-8000-000000000002', 'Pâtes complètes crues', 90, 'g', 1),
  ('c2000000-0000-4000-8000-000000000002', 'Bœuf haché 5%', 160, 'g', 2),
  ('c2000000-0000-4000-8000-000000000002', 'Coulis de tomates concassées & origan', 200, 'g', 3),

  -- 13. Poulet Basquaise & Riz Brun
  ('c2000000-0000-4000-8000-000000000003', 'Blanc de poulet fermier', 160, 'g', 1),
  ('c2000000-0000-4000-8000-000000000003', 'Riz brun complet cru', 80, 'g', 2),
  ('c2000000-0000-4000-8000-000000000003', 'Poivrons rouge et vert émincés', 150, 'g', 3),

  -- 14. Shaker Mass & Recovery
  ('c2000000-0000-4000-8000-000000000004', 'Farine d''avoine instantanée', 50, 'g', 1),
  ('c2000000-0000-4000-8000-000000000004', 'Whey protéine isolate', 35, 'g', 2),
  ('c2000000-0000-4000-8000-000000000004', 'Banane mûre', 1, 'unité', 3),
  ('c2000000-0000-4000-8000-000000000004', 'Lait demi-écrémé ou végétal', 300, 'ml', 4),

  -- 15. Pavé de Saumon & Riz Basmati Sauvage
  ('c2000000-0000-4000-8000-000000000005', 'Pavé de saumon frais', 160, 'g', 1),
  ('c2000000-0000-4000-8000-000000000005', 'Riz basmati sauvage cru', 80, 'g', 2),
  ('c2000000-0000-4000-8000-000000000005', 'Asperges vertes vapeur', 120, 'g', 3),

  -- 16. Omelette 4 Œufs & Avoine
  ('c2000000-0000-4000-8000-000000000006', 'Œufs entiers', 3, 'unités', 1),
  ('c2000000-0000-4000-8000-000000000006', 'Blancs d''œufs', 2, 'unités', 2),
  ('c2000000-0000-4000-8000-000000000006', 'Flocons d''avoine', 40, 'g', 3),
  ('c2000000-0000-4000-8000-000000000006', 'Pousses d''épinards', 50, 'g', 4),

  -- 17. Chili Con Carne Striker
  ('c2000000-0000-4000-8000-000000000007', 'Bœuf haché 5%', 180, 'g', 1),
  ('c2000000-0000-4000-8000-000000000007', 'Haricots rouges cuits', 150, 'g', 2),
  ('c2000000-0000-4000-8000-000000000007', 'Tomates concassées & maïs', 150, 'g', 3),

  -- 18. Risotto d''Épeautre au Poulet
  ('c2000000-0000-4000-8000-000000000008', 'Filet de poulet', 160, 'g', 1),
  ('c2000000-0000-4000-8000-000000000008', 'Petit épeautre cru', 80, 'g', 2),
  ('c2000000-0000-4000-8000-000000000008', 'Champignons de Paris bruns', 150, 'g', 3),

  -- 19. Porridge Beurre de Cacahuète & Banane
  ('c2000000-0000-4000-8000-000000000009', 'Flocons d''avoine', 60, 'g', 1),
  ('c2000000-0000-4000-8000-000000000009', 'Whey protéine vanille', 20, 'g', 2),
  ('c2000000-0000-4000-8000-000000000009', 'Beurre de cacahuète pur', 20, 'g', 3),
  ('c2000000-0000-4000-8000-000000000009', 'Banane tranchée', 1, 'unité', 4),

  -- 20. Filet Mignon de Porc & Patates Douces
  ('c2000000-0000-4000-8000-000000000010', 'Médaillons de filet mignon de porc', 180, 'g', 1),
  ('c2000000-0000-4000-8000-000000000010', 'Patate douce pour purée', 250, 'g', 2),
  ('c2000000-0000-4000-8000-000000000010', 'Romarin frais & muscade', 1, 'portion', 3),

  -- 21. Salade Quinoa, Poulet & Féta
  ('c3000000-0000-4000-8000-000000000001', 'Escalope de poulet grillée', 150, 'g', 1),
  ('c3000000-0000-4000-8000-000000000001', 'Quinoa cuit', 120, 'g', 2),
  ('c3000000-0000-4000-8000-000000000001', 'Féta grecque AOP émiettée', 30, 'g', 3),

  -- 22. Bowl Burrito Dinde & Guacamole
  ('c3000000-0000-4000-8000-000000000002', 'Blanc de dinde sauté', 150, 'g', 1),
  ('c3000000-0000-4000-8000-000000000002', 'Riz basmati cuit & haricots noirs', 130, 'g', 2),
  ('c3000000-0000-4000-8000-000000000002', 'Avocat écrasé minute', 0.25, 'unité', 3),

  -- 23. Poulet Yakitori
  ('c3000000-0000-4000-8000-000000000003', 'Blanc de poulet en cubes', 160, 'g', 1),
  ('c3000000-0000-4000-8000-000000000003', 'Légumes croquants au wok', 200, 'g', 2),
  ('c3000000-0000-4000-8000-000000000003', 'Sauce soja & miel d''acacia', 1, 'c.à.s', 3),

  -- 24. Wok de Bœuf aux Noix de Cajou
  ('c3000000-0000-4000-8000-000000000004', 'Bœuf maigre émincé', 150, 'g', 1),
  ('c3000000-0000-4000-8000-000000000004', 'Poivrons & pousses de soja', 180, 'g', 2),
  ('c3000000-0000-4000-8000-000000000004', 'Noix de cajou concassées', 15, 'g', 3),

  -- 25. Smoothie Vert Spiruline
  ('c3000000-0000-4000-8000-000000000005', 'Jeunes pousses d''épinards frais', 50, 'g', 1),
  ('c3000000-0000-4000-8000-000000000005', 'Whey isolate ou végétale', 25, 'g', 2),
  ('c3000000-0000-4000-8000-000000000005', 'Eau de coco naturelle & spiruline', 200, 'ml', 3),

  -- 26. Filet de Dinde Mariné Citron & Riz
  ('c3000000-0000-4000-8000-000000000006', 'Filet de dinde', 160, 'g', 1),
  ('c3000000-0000-4000-8000-000000000006', 'Riz basmati cru', 60, 'g', 2),
  ('c3000000-0000-4000-8000-000000000006', 'Haricots verts frais & citron', 150, 'g', 3),

  -- 27. Pancakes Protéinés Avoine & Myrtilles
  ('c3000000-0000-4000-8000-000000000007', 'Flocons d''avoine mixés', 40, 'g', 1),
  ('c3000000-0000-4000-8000-000000000007', 'Œufs entiers', 2, 'unités', 2),
  ('c3000000-0000-4000-8000-000000000007', 'Blanc d''œuf', 1, 'unité', 3),
  ('c3000000-0000-4000-8000-000000000007', 'Myrtilles fraîches', 40, 'g', 4),

  -- 28. Pavé de Thon Mi-Cuit au Sésame
  ('c3000000-0000-4000-8000-000000000008', 'Pavé de thon albacore frais', 150, 'g', 1),
  ('c3000000-0000-4000-8000-000000000008', 'Graines de sésame blanc & noir', 15, 'g', 2),
  ('c3000000-0000-4000-8000-000000000008', 'Haricots plats vapeur', 180, 'g', 3),

  -- 29. Cottage Cheese Protéiné & Pomme
  ('c3000000-0000-4000-8000-000000000009', 'Cottage cheese allégé', 200, 'g', 1),
  ('c3000000-0000-4000-8000-000000000009', 'Pomme Granny Smith râpée', 0.5, 'unité', 2),
  ('c3000000-0000-4000-8000-000000000009', 'Cerneaux de noix & cannelle', 10, 'g', 3),

  -- 30. Curry de Pois Chiches, Épinards & Poulet
  ('c3000000-0000-4000-8000-000000000010', 'Escalope de poulet émincée', 150, 'g', 1),
  ('c3000000-0000-4000-8000-000000000010', 'Pois chiches cuits', 100, 'g', 2),
  ('c3000000-0000-4000-8000-000000000010', 'Pousses d''épinards frais', 100, 'g', 3)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 2. CATALOGUE ENRICHI DE PROGRAMMES D'ENTRAÎNEMENT & KB SHRED
-- =============================================================================

-- A. PROGRAMMES MAISON
INSERT INTO public.workout_programs (
  id, title, slug, description, primary_goal, location, required_equipment,
  level, sessions_per_week, duration_weeks, is_kb_shred, is_premium, is_active, display_order
) VALUES
(
  'a2000000-0000-4000-8000-000000000001',
  'Striker Bodyweight — Débutant Maison',
  'striker-bodyweight-debutant',
  'Programme progressif au poids du corps sans matériel pour débuter la remise en forme combat et développer le cardio de base.',
  'weight_loss',
  'home',
  ARRAY['bodyweight']::TEXT[],
  'Débutant',
  3,
  4,
  FALSE,
  FALSE,
  TRUE,
  10
),
(
  'a2000000-0000-4000-8000-000000000002',
  'Striker High Density — Intermédiaire Maison',
  'striker-high-density-intermediaire',
  'Circuits HIIT au poids du corps et shadow boxing rythmé pour maximiser la dépense calorique et l''explosivité.',
  'both',
  'home',
  ARRAY['bodyweight']::TEXT[],
  'Intermédiaire',
  4,
  6,
  FALSE,
  FALSE,
  TRUE,
  11
),
(
  'a2000000-0000-4000-8000-000000000003',
  'Dumbbell Striker — Haltères à Domicile',
  'dumbbell-striker-maison',
  'Entraînement complet avec une paire d''haltères pour allier renforcement musculaire ciblé et endurance de frappe.',
  'muscle_gain',
  'home',
  ARRAY['dumbbells', 'bodyweight']::TEXT[],
  'Intermédiaire',
  3,
  6,
  FALSE,
  TRUE,
  TRUE,
  12
),
(
  'a2000000-0000-4000-8000-000000000004',
  'KB Conditioning — Kettlebell Home Shred',
  'kb-conditioning-kettlebell-home',
  'Circuits métaboliques 100% Kettlebell à domicile pour brûler les graisses et forger une sangle abdominale d''acier.',
  'weight_loss',
  'home',
  ARRAY['kettlebell']::TEXT[],
  'Tous niveaux',
  3,
  4,
  TRUE,
  FALSE,
  TRUE,
  13
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_kb_shred = EXCLUDED.is_kb_shred,
  updated_at = NOW();

-- B. PROGRAMMES SALLE
INSERT INTO public.workout_programs (
  id, title, slug, description, primary_goal, location, required_equipment,
  level, sessions_per_week, duration_weeks, is_kb_shred, is_premium, is_active, display_order
) VALUES
(
  'a3000000-0000-4000-8000-000000000001',
  'Gym Starter — Musculation Machines Débutant',
  'gym-starter-machines-debutant',
  'Prise en main guidée des machines en salle de sport pour apprendre les mouvements fondamentaux en sécurité.',
  'both',
  'gym',
  ARRAY['machines']::TEXT[],
  'Débutant',
  3,
  4,
  FALSE,
  FALSE,
  TRUE,
  20
),
(
  'a3000000-0000-4000-8000-000000000002',
  'Hypertrophie Striker — Prise de Masse Athlétique',
  'hypertrophie-striker-gym',
  'Split 4 jours par semaine combinant charges lourdes guidées et haltères libres pour un physique plein et puissant.',
  'muscle_gain',
  'gym',
  ARRAY['dumbbells', 'machines']::TEXT[],
  'Intermédiaire',
  4,
  8,
  FALSE,
  TRUE,
  TRUE,
  21
),
(
  'a3000000-0000-4000-8000-000000000003',
  'Renforcement Général & Puissance Combat Gym',
  'renforcement-general-puissance-gym',
  'Développement de la force fonctionnelle (tirages, poussées, squat, gainage lourd) pour athlètes et combattants.',
  'both',
  'gym',
  ARRAY['dumbbells', 'machines', 'bodyweight']::TEXT[],
  'Avancé',
  4,
  6,
  FALSE,
  TRUE,
  TRUE,
  22
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_kb_shred = EXCLUDED.is_kb_shred,
  updated_at = NOW();

-- C. KB SHRED PROTOCOLES (DÉBUTANT & INTERMÉDIAIRE HYBRIDE)
INSERT INTO public.workout_programs (
  id, title, slug, description, primary_goal, location, required_equipment,
  level, sessions_per_week, duration_weeks, is_kb_shred, is_premium, is_active, display_order
) VALUES
(
  'a4000000-0000-4000-8000-000000000001',
  'KB SHRED — Protocole Débutant Fondamentaux',
  'kb-shred-protocole-debutant',
  'Apprentissage et maîtrise du Hip Hinge, Swing à deux mains, Goblet Squat et gainage anti-rotation.',
  'weight_loss',
  'hybrid',
  ARRAY['kettlebell', 'bodyweight']::TEXT[],
  'Débutant',
  3,
  4,
  TRUE,
  FALSE,
  TRUE,
  1
),
(
  'a4000000-0000-4000-8000-000000000002',
  'KB SHRED — Protocole Intermédiaire Haute Densité',
  'kb-shred-protocole-intermediaire',
  'Circuits Kettlebell complexes (Clean, Press, Snatch, Swings 1 bras) alternés avec vos séances club au Striking Camp.',
  'both',
  'hybrid',
  ARRAY['kettlebell', 'bodyweight']::TEXT[],
  'Intermédiaire',
  4,
  6,
  TRUE,
  TRUE,
  TRUE,
  2
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_kb_shred = EXCLUDED.is_kb_shred,
  updated_at = NOW();

-- D. SESSIONS POUR LES NOUVEAUX PROGRAMMES
INSERT INTO public.program_sessions (
  id, program_id, day_number, title, description, duration_minutes, is_club_session, club_discipline_tag, is_active, display_order
) VALUES
  -- Sessions KB SHRED Débutant
  ('b4000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 1, 'KB Shred Fondations — Swings & Goblet Squat', 'Maîtrise de la poussée des hanches et endurance de base.', 35, FALSE, 'KB Shred', TRUE, 1),
  ('b4000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001', 2, 'Séance Club — Boxing Shred / Small Group', 'Créneau physique au club Striking Camp encadré par le coach.', 50, TRUE, 'Boxing Shred', TRUE, 2),
  ('b4000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000001', 3, 'KB Shred Core & Cardio — Clean & Carries', 'Renforcement de la sangle abdominale et puissance des épaules.', 35, FALSE, 'KB Shred', TRUE, 3),

  -- Sessions Striker Bodyweight Débutant
  ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 1, 'Full Body Awakening — Poids du corps', 'Pompes sur genoux, squats au poids du corps et gainage statique.', 30, FALSE, NULL, TRUE, 1),
  ('b2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 2, 'Cardio Combat & Shadow Boxing Débutant', 'Déplacements de boxe simples et montées de genoux modérées.', 30, FALSE, NULL, TRUE, 2),
  ('b2000000-0000-4000-8000-000000000003', 'a2000000-0000-4000-8000-000000000001', 3, 'Lower Body & Core Stability', 'Fentes statiques, ponts fessiers et planche active.', 30, FALSE, NULL, TRUE, 3),

  -- Sessions Gym Starter
  ('b3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 1, 'Haut du Corps — Pectoraux & Dos Guidés', 'Presse pectorale convergente, tirage vertical et tirage horizontal.', 45, FALSE, NULL, TRUE, 1),
  ('b3000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001', 2, 'Bas du Corps — Presse à cuisses & Ischios', 'Presse 45°, leg curl assis et mollets guidés.', 45, FALSE, NULL, TRUE, 2),
  ('b3000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000001', 3, 'Épaules, Bras & Sangle Abdominale', 'Développé épaules machine, triceps poulie et crunch machine.', 45, FALSE, NULL, TRUE, 3)
ON CONFLICT (program_id, day_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  is_club_session = EXCLUDED.is_club_session,
  club_discipline_tag = EXCLUDED.club_discipline_tag;

-- E. EXERCICES POUR LES SESSIONS DE BASE
INSERT INTO public.program_exercises (
  session_id, name, sets, reps_or_duration, rest_seconds, instructions, display_order
) VALUES
  -- Session KB Shred Fondations
  ('b4000000-0000-4000-8000-000000000001', 'Kettlebell Swings Russe 2 mains', 4, '15 reps', 60, 'Charnière de hanche puissante, dos neutre, verrouillage des fessiers en haut.', 1),
  ('b4000000-0000-4000-8000-000000000001', 'Goblet Squats avec Kettlebell', 4, '10 reps', 60, 'Kettlebell collée au thorax, descendre hanches ouvertes sans arrondir le bas du dos.', 2),
  ('b4000000-0000-4000-8000-000000000001', 'Planche Abdominale Statique', 3, '30 sec', 45, 'Rétroversion du bassin, coudes sous les épaules, corps aligné.', 3),
  ('b4000000-0000-4000-8000-000000000001', 'Farmer Walk (Marche du Fermier avec charge)', 3, '40 sec', 45, 'Épaules basses, buste droit, marche contrôlée.', 4),

  -- Session Striker Bodyweight Débutant
  ('b2000000-0000-4000-8000-000000000001', 'Squats au poids du corps', 3, '15 reps', 45, 'Pieds largeur d''épaules, descendre cuissards parallèles au sol.', 1),
  ('b2000000-0000-4000-8000-000000000001', 'Pompes sur les genoux ou inclinées', 3, '10 reps', 45, 'Mains écartées largeur d''épaules, gainage solide.', 2),
  ('b2000000-0000-4000-8000-000000000001', 'Mountain Climbers modérés', 3, '30 sec', 45, 'Ramener alternativement les genoux vers la poitrine avec contrôle.', 3),
  ('b2000000-0000-4000-8000-000000000001', 'Bird Dog (Gainage dynamique bras/jambe)', 3, '10 reps/côté', 30, 'Dos droit, allonger le bras droit et la jambe gauche simultanément.', 4),

  -- Session Gym Starter Haut du Corps
  ('b3000000-0000-4000-8000-000000000001', 'Développé Assis Machine Guidée', 4, '12 reps', 60, 'Pieds bien à plat, omoplates serrées contre le dossier, pousser sans verrouiller les coudes.', 1),
  ('b3000000-0000-4000-8000-000000000001', 'Tirage Vertical à la Poulie Haute (Prise Large)', 4, '12 reps', 60, 'Tirer vers le haut du sternum en engageant les dorsaux.', 2),
  ('b3000000-0000-4000-8000-000000000001', 'Tirage Horizontal Rameur Machine', 3, '12 reps', 60, 'Buste appuyé sur le support, tirer les coudes vers l''arrière.', 3),
  ('b3000000-0000-4000-8000-000000000001', 'Gainage Obliques au Sol', 3, '25 sec/côté', 45, 'Coude sous l''épaule, hanches alignées.', 4)
ON CONFLICT DO NOTHING;

COMMIT;
