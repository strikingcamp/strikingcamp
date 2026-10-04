-- =============================================================================
-- Migration : 20261003_nutrition_recipes_enhancement.sql
-- Description : Évolution du système Nutrition & Bibliothèque de Recettes V1
--               - Ajout de prep_time_preference dans public.user_fitness_profiles
--               - Extension des objectifs acceptés par public.recipes (weight_loss, muscle_gain, maintenance, recomposition, both, all)
--               - Insertion idempotente de 40 nouvelles recettes complètes et de leurs ingrédients
-- =============================================================================

BEGIN;

-- 1. Ajout de prep_time_preference dans public.user_fitness_profiles
ALTER TABLE public.user_fitness_profiles
  ADD COLUMN IF NOT EXISTS prep_time_preference TEXT NOT NULL DEFAULT 'flexible'
  CHECK (prep_time_preference IN ('quick', 'standard', 'flexible'));

-- 2. Mise à jour de la contrainte target_goal dans public.recipes
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_target_goal_check;
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_target_goal_check
  CHECK (target_goal IN ('weight_loss', 'muscle_gain', 'maintenance', 'recomposition', 'both', 'all'));

-- 3. Insertion idempotente des 40 recettes enrichies
INSERT INTO public.recipes (
  id, title, slug, category, target_goal, prep_time_minutes, difficulty,
  calories, proteins_g, carbs_g, fats_g, image_url, instructions, tags, is_premium, is_active, display_order
) VALUES
-- ==========================================
-- A. PETITS-DÉJEUNERS : FROMAGE BLANC (6)
-- ==========================================
(
  'e2000001-0001-4000-8000-000000000001',
  'Fromage blanc aux fruits rouges & graines de chia',
  'fromage-blanc-fruits-rouges-chia',
  'breakfast',
  'all',
  5,
  'Facile',
  260,
  28.0,
  22.0,
  5.0,
  '/images/recipes/fb-fruits-rouges.jpg',
  '1. Verser 250g de fromage blanc 0% ou 3% dans un bol.\n2. Ajouter 100g de mélange de fruits rouges frais ou décongelés (framboises, myrtilles, mûres).\n3. Saupoudrer de 1 cuillère à café de graines de chia (5g).\n4. Ajouter une pointe d''extrait de vanille ou un filet de stevia si souhaité. Déguster frais.',
  ARRAY['high_protein', 'quick', 'breakfast', 'clean_eating', 'vegetarian']::TEXT[],
  FALSE,
  TRUE,
  10
),
(
  'e2000001-0001-4000-8000-000000000002',
  'Fromage blanc banane & beurre de cacahuète',
  'fromage-blanc-banane-beurre-cacahuete',
  'breakfast',
  'muscle_gain',
  5,
  'Facile',
  380,
  30.0,
  38.0,
  11.0,
  '/images/recipes/fb-banane-peanut.jpg',
  '1. Déposer 250g de fromage blanc dans un bol.\n2. Couper une banane mûre en fines rondelles et les disposer sur le fromage blanc.\n3. Napper d''une cuillère à soupe (15g) de beurre de cacahuète 100% pur.\n4. Saupoudrer d''une pincée de cannelle moulue.',
  ARRAY['high_protein', 'quick', 'breakfast', 'muscle_gain']::TEXT[],
  FALSE,
  TRUE,
  11
),
(
  'e2000001-0001-4000-8000-000000000003',
  'Fromage blanc pomme croquante & cannelle',
  'fromage-blanc-pomme-cannelle',
  'breakfast',
  'weight_loss',
  5,
  'Facile',
  230,
  26.0,
  25.0,
  2.5,
  '/images/recipes/fb-pomme-cannelle.jpg',
  '1. Couper une demi-pomme (type Gala ou Granny) en petits dés croquants.\n2. Dans un bol, verser 250g de fromage blanc.\n3. Incorporer les dés de pomme et saupoudrer généreusement de cannelle de Ceylan.\n4. Mélanger pour diffuser le parfum de la cannelle.',
  ARRAY['high_protein', 'quick', 'breakfast', 'low_fat', 'satiety']::TEXT[],
  FALSE,
  TRUE,
  12
),
(
  'e2000001-0001-4000-8000-000000000004',
  'Fromage blanc kiwi & granola maison sans sucre',
  'fromage-blanc-kiwi-granola',
  'breakfast',
  'recomposition',
  5,
  'Facile',
  310,
  27.0,
  34.0,
  6.5,
  '/images/recipes/fb-kiwi-granola.jpg',
  '1. Éplucher et trancher un kiwi vert ou jaune riche en vitamine C.\n2. Remplir le bol avec 250g de fromage blanc.\n3. Disposer les tranches de kiwi et ajouter 25g de granola avoine/graines non sucré pour le croustillant.',
  ARRAY['high_protein', 'quick', 'breakfast', 'vitamin_c']::TEXT[],
  FALSE,
  TRUE,
  13
),
(
  'e2000001-0001-4000-8000-000000000005',
  'Fromage blanc mangue fraîche & coco râpée',
  'fromage-blanc-mangue-coco',
  'breakfast',
  'maintenance',
  5,
  'Facile',
  280,
  26.0,
  30.0,
  5.5,
  '/images/recipes/fb-mangue-coco.jpg',
  '1. Découper 80g de mangue fraîche en petits dés juteux.\n2. Disposer sur 250g de fromage blanc onctueux.\n3. Parsemer d''une cuillère à café de noix de coco râpée non sucrée (5g).',
  ARRAY['high_protein', 'quick', 'breakfast', 'tropical']::TEXT[],
  FALSE,
  TRUE,
  14
),
(
  'e2000001-0001-4000-8000-000000000006',
  'Fromage blanc cacao pur intense & banane',
  'fromage-blanc-cacao-banane',
  'breakfast',
  'all',
  5,
  'Facile',
  290,
  28.0,
  32.0,
  4.5,
  '/images/recipes/fb-cacao-banane.jpg',
  '1. Dans un bol, mélanger 250g de fromage blanc avec 1 cuillère à café bombée (7g) de cacao pur dégraissé non sucré.\n2. Fouetter à la cuillère jusqu''à texture chocolatée homogène.\n3. Découper 1/2 banane mûre en rondelles sur le dessus.',
  ARRAY['high_protein', 'quick', 'breakfast', 'antioxidant']::TEXT[],
  FALSE,
  TRUE,
  15
),

-- ==========================================
-- A. PETITS-DÉJEUNERS : PORRIDGES (4)
-- ==========================================
(
  'e2000001-0001-4000-8000-000000000007',
  'Porridge protéiné banane & cannelle',
  'porridge-proteine-banane-cannelle',
  'breakfast',
  'recomposition',
  8,
  'Facile',
  360,
  24.0,
  52.0,
  5.5,
  '/images/recipes/porridge-banane.jpg',
  '1. Dans une casserole, mélanger 45g de flocons d''avoine avec 180ml de lait végétal ou écrémé et 1 pincée de sel.\n2. Cuire à feu moyen 4-5 minutes en remuant jusqu''à épaississement crémeux.\n3. Hors du feu, incorporer 15g de whey ou fromage blanc pour doper les protéines.\n4. Servir avec 1/2 banane en rondelles et cannelle.',
  ARRAY['high_protein', 'quick', 'breakfast', 'complex_carbs']::TEXT[],
  FALSE,
  TRUE,
  16
),
(
  'e2000001-0001-4000-8000-000000000008',
  'Porridge fruits rouges & graines de chia',
  'porridge-fruits-rouges-chia',
  'breakfast',
  'weight_loss',
  8,
  'Facile',
  310,
  20.0,
  44.0,
  5.0,
  '/images/recipes/porridge-fruits-rouges.jpg',
  '1. Cuire 40g de flocons d''avoine dans 160ml d''eau et lait d''amande.\n2. Ajouter 1 cuillère à café de graines de chia pendant la cuisson.\n3. Incorporer 100g de framboises et myrtilles qui fondent légèrement avec la chaleur.\n4. Servir tiède avec un zeste de citron.',
  ARRAY['high_protein', 'quick', 'breakfast', 'satiety', 'antioxidant']::TEXT[],
  FALSE,
  TRUE,
  17
),
(
  'e2000001-0001-4000-8000-000000000009',
  'Porridge pomme fondante à la cannelle',
  'porridge-pomme-cannelle',
  'breakfast',
  'maintenance',
  10,
  'Facile',
  330,
  21.0,
  48.0,
  5.0,
  '/images/recipes/porridge-pomme.jpg',
  '1. Faire revenir 1/2 pomme en dés 2 min avec une cuillère d''eau et de la cannelle dans la casserole.\n2. Ajouter 45g de flocons d''avoine et 180ml de lait.\n3. Laisser mijoter 4 min à feu doux.\n4. Décorer avec quelques éclats d''amandes effilées.',
  ARRAY['high_protein', 'breakfast', 'cozy', 'complex_carbs']::TEXT[],
  FALSE,
  TRUE,
  18
),
(
  'e2000001-0001-4000-8000-000000000010',
  'Porridge chocolat noir intense & banane',
  'porridge-chocolat-banane',
  'breakfast',
  'muscle_gain',
  8,
  'Facile',
  420,
  26.0,
  56.0,
  9.0,
  '/images/recipes/porridge-choco-banane.jpg',
  '1. Cuire 50g d''avoine avec 200ml de lait et 1 cuillère à café de cacao pur.\n2. Hors du feu, déposer 1 carré de chocolat noir 85% (10g) au centre pour le faire fondre.\n3. Ajouter 20g de protéines en poudre ou skyr.\n4. Garnir d''une banane entière coupée en tranches.',
  ARRAY['high_protein', 'quick', 'breakfast', 'muscle_gain', 'energy']::TEXT[],
  FALSE,
  TRUE,
  19
),

-- ==========================================
-- A. PETITS-DÉJEUNERS : PANCAKES (3)
-- ==========================================
(
  'e2000001-0001-4000-8000-000000000011',
  'Pancakes express avoine & banane (sans sucre ajouté)',
  'pancakes-avoine-banane',
  'breakfast',
  'all',
  10,
  'Facile',
  340,
  22.0,
  46.0,
  6.5,
  '/images/recipes/pancakes-avoine.jpg',
  '1. Écraser 1 banane mûre avec 2 œufs entiers et 40g de flocons d''avoine mixés.\n2. Chauffer une poêle antiadhésive à feu moyen avec une goutte d''huile d''olive essuyée.\n3. Verser 3 petits tas de pâte, cuire 2 min de chaque côté jusqu''à dorure.\n4. Déguster chaud avec un filet de jus de citron ou quelques baies.',
  ARRAY['high_protein', 'quick', 'breakfast', 'clean_eating']::TEXT[],
  FALSE,
  TRUE,
  20
),
(
  'e2000001-0001-4000-8000-000000000012',
  'Pancakes moelleux au fromage blanc & vanille',
  'pancakes-fromage-blanc-vanille',
  'breakfast',
  'weight_loss',
  10,
  'Facile',
  290,
  29.0,
  28.0,
  4.5,
  '/images/recipes/pancakes-fb-vanille.jpg',
  '1. Fouetter 150g de fromage blanc avec 1 œuf entier + 1 blanc, 30g de farine complète et 1 pincée de levure.\n2. Parfumer avec extrait de vanille naturelle.\n3. Cuire 3 pancakes épais à la poêle à feu doux 2-3 min par face avec couvercle.\n4. Texture ultra légère et soufflée.',
  ARRAY['high_protein', 'quick', 'breakfast', 'fluffy', 'satiety']::TEXT[],
  FALSE,
  TRUE,
  21
),
(
  'e2000001-0001-4000-8000-000000000013',
  'Pancakes protéinés aux myrtilles & coulis rouge',
  'pancakes-proteines-myrtilles',
  'breakfast',
  'recomposition',
  10,
  'Facile',
  320,
  27.0,
  36.0,
  5.5,
  '/images/recipes/pancakes-myrtilles.jpg',
  '1. Préparer la pâte avec 1 œuf, 100g de skyr/fromage blanc et 35g de farine d''avoine.\n2. Déposer des myrtilles fraîches directement sur les pancakes en début de cuisson.\n3. Retourner quand les bulles apparaissent.\n4. Écraser 40g de framboises à la fourchette pour faire un coulis 100% fruits minute.',
  ARRAY['high_protein', 'quick', 'breakfast', 'antioxidant']::TEXT[],
  FALSE,
  TRUE,
  22
),

-- ==========================================
-- A. PETITS-DÉJEUNERS : TARTINES (4)
-- ==========================================
(
  'e2000001-0001-4000-8000-000000000014',
  'Tartine avocat crémeux & œuf mollet sur pain au levain',
  'tartine-avocat-oeuf-levain',
  'breakfast',
  'recomposition',
  8,
  'Facile',
  340,
  18.0,
  28.0,
  16.0,
  '/images/recipes/tartine-avocat-oeuf.jpg',
  '1. Toaster 1 tranche épaisse (50g) de pain complet au levain ou seigle.\n2. Écraser 1/3 d''avocat avec sel, poivre et jus de citron, puis tartiner.\n3. Cuire 1 œuf mollet (6 min dans l''eau bouillante) ou poché et le déposer sur l''avocat.\n4. Fendre l''œuf pour laisser couler le jaune et saupoudrer de piment d''Espelette.',
  ARRAY['quick', 'breakfast', 'healthy_fats', 'satiety']::TEXT[],
  FALSE,
  TRUE,
  23
),
(
  'e2000001-0001-4000-8000-000000000015',
  'Tartine nordique saumon fumé & fromage frais aneth',
  'tartine-saumon-fume-fromage-frais',
  'breakfast',
  'all',
  5,
  'Facile',
  310,
  24.0,
  26.0,
  10.5,
  '/images/recipes/tartine-saumon.jpg',
  '1. Toaster 1 belle tranche de pain de seigle ou complet.\n2. Tartiner de 30g de fromage frais allégé ou carré frais 0% mélangé à de l''aneth ciselée.\n3. Déposer 60g de saumon fumé ou truite fumée de qualité.\n4. Arroser de quelques gouttes de jus de citron frais.',
  ARRAY['high_protein', 'quick', 'breakfast', 'omega3']::TEXT[],
  FALSE,
  TRUE,
  24
),
(
  'e2000001-0001-4000-8000-000000000016',
  'Tartine énergétique banane, beurre de cacahuète & graines',
  'tartine-banane-beurre-cacahuete',
  'breakfast',
  'muscle_gain',
  5,
  'Facile',
  350,
  14.0,
  46.0,
  12.0,
  '/images/recipes/tartine-peanut-banane.jpg',
  '1. Toaster 1 tranche de pain complet aux céréales.\n2. Étaler généreusement 20g de beurre de cacahuète 100% pur sans huile de palme.\n3. Disposer 1/2 banane coupée en fines lamelles.\n4. Saupoudrer de graines de chanvre ou de graines de courge.',
  ARRAY['quick', 'breakfast', 'pre_workout', 'energy']::TEXT[],
  FALSE,
  TRUE,
  25
),
(
  'e2000001-0001-4000-8000-000000000017',
  'Tartine ricotta fraîche, fraises & pointe de miel',
  'tartine-ricotta-fruits-frais',
  'breakfast',
  'maintenance',
  5,
  'Facile',
  250,
  12.0,
  32.0,
  7.0,
  '/images/recipes/tartine-ricotta-fruits.jpg',
  '1. Toaster 1 tranche de pain complet croustillant.\n2. Tartiner avec 40g de ricotta fraîche italienne.\n3. Disposer des fraises ou figues fraîches émincées.\n4. Napper d''une demi-cuillère à café de miel d''acacia et feuilles de menthe.',
  ARRAY['quick', 'breakfast', 'gourmet', 'fresh']::TEXT[],
  FALSE,
  TRUE,
  26
),

-- ==========================================
-- B. DÉJEUNERS / DÎNERS : SALADES & BOWLS (12)
-- ==========================================
(
  'e2000001-0001-4000-8000-000000000018',
  'Bowl Poulet rôti, Quinoa, Roquette & Tomates cerises',
  'bowl-poulet-quinoa-roquette',
  'lunch',
  'all',
  15,
  'Facile',
  490,
  44.0,
  48.0,
  12.0,
  '/images/recipes/bowl-poulet-quinoa.jpg',
  '1. Cuire 60g de quinoa dans un bouillon de légumes et laisser tiédir.\n2. Émincer et dorer 150g d''escalope de poulet aux herbes de Provence.\n3. Dans un grand bol, disposer un lit de roquette poivrée et tomates cerises coupées en deux.\n4. Ajouter le quinoa, le poulet émincé, 1/4 d''oignon rouge et assaisonner avec 1 c.à.c d''huile d''olive et jus de citron.',
  ARRAY['high_protein', 'lunch', 'dinner', 'balanced', 'clean_eating']::TEXT[],
  FALSE,
  TRUE,
  30
),
(
  'e2000001-0001-4000-8000-000000000019',
  'Bowl Saumon frais, Avocat, Riz basmati & Fèves',
  'bowl-saumon-avocat-riz-feves',
  'lunch',
  'recomposition',
  15,
  'Facile',
  560,
  38.0,
  52.0,
  20.0,
  '/images/recipes/bowl-saumon-avocat.jpg',
  '1. Cuire 60g de riz basmati et blanchir 50g de fèves ou edamame 3 min.\n2. Couper 130g de pavé de saumon cru en dés réguliers et mariner avec 1 c.à.s de sauce soja et sésame.\n3. Disposer dans le bol le riz basmati, le saumon mariné, 1/3 d''avocat en tranches et les fèves.\n4. Saupoudrer de graines de sésame torréfiées.',
  ARRAY['high_protein', 'lunch', 'dinner', 'omega3', 'gourmet']::TEXT[],
  FALSE,
  TRUE,
  31
),
(
  'e2000001-0001-4000-8000-000000000020',
  'Pasta Bowl Thon Méditerranéen, Pâtes complètes & Mâche',
  'pasta-bowl-thon-mediterraneen',
  'lunch',
  'maintenance',
  12,
  'Facile',
  480,
  39.0,
  54.0,
  10.0,
  '/images/recipes/pasta-thon-bowl.jpg',
  '1. Cuire 60g de pennes complètes al dente et rincer sous l''eau froide.\n2. Émietter une boîte de 130g de thon au naturel égoutté.\n3. Dans le bol, mélanger les pâtes, le thon, une poignée de mâche fraîche, 5 olives noires et des dés de concombre.\n4. Assaisonner d''une vinaigrette légère au citron et origan.',
  ARRAY['high_protein', 'quick', 'lunch', 'dinner', 'mediterranean']::TEXT[],
  FALSE,
  TRUE,
  32
),
(
  'e2000001-0001-4000-8000-000000000021',
  'Chicken Pesto Bowl, Riz complet, Épinards & Tomates séchées',
  'chicken-pesto-bowl-riz-complet',
  'dinner',
  'muscle_gain',
  15,
  'Facile',
  580,
  45.0,
  56.0,
  18.0,
  '/images/recipes/chicken-pesto-bowl.jpg',
  '1. Cuire 65g de riz complet.\n2. Saisir 150g de blanc de poulet émincé à feu vif.\n3. Mélanger le poulet chaud avec 1 c.à.s de pesto vert au basilic.\n4. Dresser sur un lit de pousses d''épinards frais avec le riz et 4 pétales de tomates séchées émincées.',
  ARRAY['high_protein', 'dinner', 'lunch', 'muscle_gain', 'italian']::TEXT[],
  FALSE,
  TRUE,
  33
),
(
  'e2000001-0001-4000-8000-000000000022',
  'Bowl Thon mariné, Riz complet, Concombre & Maïs',
  'bowl-thon-riz-complet-concombre',
  'lunch',
  'weight_loss',
  10,
  'Facile',
  420,
  37.0,
  46.0,
  7.0,
  '/images/recipes/bowl-thon-concombre.jpg',
  '1. Réchauffer ou utiliser 50g de riz complet cuit froid.\n2. Mélanger 130g de thon blanc avec ciboulette, sel, poivre et jus de citron vert.\n3. Ajouter 80g de dés de concombre croquants et 40g de maïs doux égoutté.\n4. Dresser dans le bol avec des feuilles de mesclun croquantes.',
  ARRAY['high_protein', 'quick', 'lunch', 'dinner', 'low_fat', 'satiety']::TEXT[],
  FALSE,
  TRUE,
  34
),
(
  'e2000001-0001-4000-8000-000000000023',
  'Salade Poulet grillé, Mâche, Roquette, Pomme & Noix',
  'salade-poulet-mache-roquette-pomme',
  'dinner',
  'weight_loss',
  12,
  'Facile',
  410,
  42.0,
  22.0,
  16.0,
  '/images/recipes/salade-poulet-pomme.jpg',
  '1. Griller 160g d''escalope de poulet émincée avec paprika doux.\n2. Composer la base avec un mélange équilibré de mâche et roquette.\n3. Trancher 1/2 pomme acidulée en fines lamelles et concasser 15g de cerneaux de noix.\n4. Disposer le poulet tiède sur la salade et arroser d''un filet de vinaigre balsamique.',
  ARRAY['high_protein', 'quick', 'dinner', 'lunch', 'low_carb']::TEXT[],
  FALSE,
  TRUE,
  35
),
(
  'e2000001-0001-4000-8000-000000000024',
  'Bowl Saumon rôti, Quinoa, Radis & Pousses d''épinards',
  'bowl-saumon-quinoa-radis-epinards',
  'dinner',
  'recomposition',
  18,
  'Facile',
  530,
  39.0,
  44.0,
  21.0,
  '/images/recipes/bowl-saumon-quinoa-radis.jpg',
  '1. Cuire le pavé de saumon (140g) au four ou à la poêle 6-8 min pour conserver son cœur fondant.\n2. Disposer 50g de quinoa cuit dans le bol avec 50g de jeunes pousses d''épinards.\n3. Émincer 4 radis croquants en rondelles fines.\n4. Déposer le saumon effeuillé, parsemer de ciboulette et assaisonner au citron.',
  ARRAY['high_protein', 'dinner', 'lunch', 'omega3', 'clean_eating']::TEXT[],
  FALSE,
  TRUE,
  36
),
(
  'e2000001-0001-4000-8000-000000000025',
  'Bowl Végétarien Protéiné : Pois chiches rôtis, Feta AOP & Quinoa',
  'bowl-vegetarien-pois-chiches-feta',
  'lunch',
  'maintenance',
  15,
  'Facile',
  470,
  22.0,
  56.0,
  16.0,
  '/images/recipes/bowl-veggie-pois-chiches.jpg',
  '1. Égoutter 120g de pois chiches et les faire dorer 5 min à la poêle avec cumin et paprika fumé.\n2. Disposer 50g de quinoa cuit sur un lit de mesclun frais.\n3. Émietter 40g de véritable feta grecque AOP.\n4. Ajouter des concombres et tomates cerises pour la fraîcheur.',
  ARRAY['vegetarian', 'lunch', 'dinner', 'plant_protein', 'fiber']::TEXT[],
  FALSE,
  TRUE,
  37
),
(
  'e2000001-0001-4000-8000-000000000026',
  'Salade Crevettes sautées à l''ail, Avocat, Mâche & Pamplemousse',
  'salade-crevettes-avocat-mache-agrumes',
  'dinner',
  'weight_loss',
  10,
  'Facile',
  360,
  34.0,
  18.0,
  15.0,
  '/images/recipes/salade-crevettes-avocat.jpg',
  '1. Saisir 160g de crevettes décortiquées 2 min dans une poêle chaude avec 1 gousse d''ail écrasée et persil.\n2. Remplir le saladier avec une généreuse portion de mâche fraîche.\n3. Ajouter 1/3 d''avocat en dés et les suprêmes d''un demi-pamplemousse rose.\n4. Déposer les crevettes tièdes et arroser avec le jus rendu.',
  ARRAY['high_protein', 'quick', 'dinner', 'low_carb', 'refreshing']::TEXT[],
  FALSE,
  TRUE,
  38
),
(
  'e2000001-0001-4000-8000-000000000027',
  'Bowl Bœuf émincé mariné, Riz basmati & Courgettes vapeur',
  'bowl-boeuf-riz-courgettes',
  'lunch',
  'muscle_gain',
  15,
  'Facile',
  540,
  46.0,
  50.0,
  15.0,
  '/images/recipes/bowl-boeuf-riz.jpg',
  '1. Émincer 150g de steak de bœuf 5% MG et mariner 5 min avec soja léger et gingembre râpé.\n2. Cuire 60g de riz basmati et tailler 1 courgette en demi-rondelles cuites 4 min vapeur.\n3. Saisir le bœuf à feu très vif 2 minutes en conservant le jus.\n4. Assembler dans le bol le riz, les courgettes fondantes et le bœuf savoureux.',
  ARRAY['high_protein', 'lunch', 'dinner', 'muscle_gain', 'iron_rich']::TEXT[],
  FALSE,
  TRUE,
  39
),
(
  'e2000001-0001-4000-8000-000000000028',
  'Salade Mozzarella di Bufala, Poulet grillé, Tomates & Roquette',
  'salade-mozzarella-poulet-roquette',
  'dinner',
  'recomposition',
  12,
  'Facile',
  460,
  45.0,
  14.0,
  24.0,
  '/images/recipes/salade-mozza-poulet.jpg',
  '1. Griller 150g de filet de poulet découpé en aiguillettes.\n2. Disposer un lit abondant de roquette fraîche et 100g de tomates cerises coupées en deux.\n3. Déchirer 60g de mozzarella di Bufala fraîche sur le dessus.\n4. Ajouter les aiguillettes de poulet chaudes et un trait de réduction de vinaigre balsamique.',
  ARRAY['high_protein', 'quick', 'dinner', 'lunch', 'italian']::TEXT[],
  FALSE,
  TRUE,
  40
),
(
  'e2000001-0001-4000-8000-000000000029',
  'Bowl Cabillaud vapeur, Patate douce rôtie & Épinards frais',
  'bowl-cabillaud-patate-douce-epinards',
  'dinner',
  'all',
  20,
  'Facile',
  430,
  40.0,
  48.0,
  7.0,
  '/images/recipes/bowl-cabillaud-patate-douce.jpg',
  '1. Cuire 160g de patate douce en cubes au four 15 min avec herbes de Provence.\n2. Cuire 160g de dos de cabillaud à la vapeur 7 min avec du sel marin et citron.\n3. Disposer dans le bol des pousses d''épinards frais, la patate douce rôtie et le cabillaud effeuillé.\n4. Arroser d''un filet d''huile d''olive vierge extra.',
  ARRAY['high_protein', 'dinner', 'lunch', 'lean_protein', 'clean_eating']::TEXT[],
  FALSE,
  TRUE,
  41
),

-- ==========================================
-- C. COLLATIONS & DESSERTS SAINS (11)
-- ==========================================
(
  'e2000001-0001-4000-8000-000000000030',
  'Fromage blanc façon Cheesecake aux fruits rouges',
  'fromage-blanc-cheesecake-fruits-rouges',
  'snack',
  'weight_loss',
  5,
  'Facile',
  210,
  24.0,
  18.0,
  3.5,
  '/images/recipes/fb-cheesecake.jpg',
  '1. Dans une verrine ou un bol, émietter 1 biscuit spéculoos ou sablé complet (12g) dans le fond.\n2. Fouetter 200g de fromage blanc 0% avec quelques gouttes d''arôme vanille et zeste de citron vert.\n3. Verser sur la base biscuitée.\n4. Napper de 60g de framboises fraîches écrasées en coulis minute.',
  ARRAY['high_protein', 'quick', 'snack', 'dessert', 'low_calorie']::TEXT[],
  FALSE,
  TRUE,
  50
),
(
  'e2000001-0001-4000-8000-000000000031',
  'Fromage blanc façon Tiramisu léger au café & cacao pur',
  'fromage-blanc-tiramisu-leger',
  'snack',
  'recomposition',
  5,
  'Facile',
  220,
  25.0,
  20.0,
  3.5,
  '/images/recipes/fb-tiramisu.jpg',
  '1. Tremper 1 biscuit cuillère (8g) dans un expresso serré non sucré et le placer au fond du verre.\n2. Recouvrir de 200g de fromage blanc fouetté avec une pointe de vanille.\n3. Saupoudrer généreusement d''un voile de cacao amer 100% pur non sucré.\n4. Déguster frais pour un effet tiramisu instantané.',
  ARRAY['high_protein', 'quick', 'snack', 'dessert', 'gourmet']::TEXT[],
  FALSE,
  TRUE,
  51
),
(
  'e2000001-0001-4000-8000-000000000032',
  'Fromage blanc pomme rôtie & cannelle caramélisée',
  'fromage-blanc-pomme-rotie-cannelle',
  'snack',
  'all',
  8,
  'Facile',
  200,
  22.0,
  22.0,
  2.5,
  '/images/recipes/fb-pomme-rotie.jpg',
  '1. Couper 1/2 pomme en dés et cuire 3 min à la poêle avec 1 c.à.s d''eau et de la cannelle jusqu''à tendreté.\n2. Verser 200g de fromage blanc dans un ramequin.\n3. Verser les dés de pommes encore tièdes et parfumés sur le fromage blanc frais.',
  ARRAY['high_protein', 'quick', 'snack', 'comfort_food']::TEXT[],
  FALSE,
  TRUE,
  52
),
(
  'e2000001-0001-4000-8000-000000000033',
  'Yaourt grec authentique, kiwi & noix de Grenoble',
  'yaourt-grec-kiwi-noix',
  'snack',
  'maintenance',
  3,
  'Facile',
  240,
  18.0,
  16.0,
  11.0,
  '/images/recipes/yaourt-grec-kiwi-noix.jpg',
  '1. Déposer 170g de véritable yaourt grec 0% ou 2% dans un bol.\n2. Ajouter 1 kiwi épluché et découpé en tranches.\n3. Concasser 15g de cerneaux de noix de Grenoble riches en bons lipides.',
  ARRAY['high_protein', 'quick', 'snack', 'healthy_fats']::TEXT[],
  FALSE,
  TRUE,
  53
),
(
  'e2000001-0001-4000-8000-000000000034',
  'Yaourt grec onctueux, mangue fraîche & noix de coco',
  'yaourt-grec-mangue-coco',
  'snack',
  'all',
  3,
  'Facile',
  230,
  18.0,
  24.0,
  6.5,
  '/images/recipes/yaourt-grec-mangue.jpg',
  '1. Verser 170g de yaourt grec dans une coupelle.\n2. Ajouter 70g de mangue fraîche juteuse en dés.\n3. Parsemer de 5g de copeaux de noix de coco non sucrés.',
  ARRAY['high_protein', 'quick', 'snack', 'refreshing']::TEXT[],
  FALSE,
  TRUE,
  54
),
(
  'e2000001-0001-4000-8000-000000000035',
  'Chia pudding express aux fruits rouges & lait d''amande',
  'chia-pudding-fruits-rouges',
  'snack',
  'weight_loss',
  5,
  'Facile',
  190,
  12.0,
  16.0,
  8.5,
  '/images/recipes/chia-pudding-fruits-rouges.jpg',
  '1. Mélanger 20g de graines de chia avec 120ml de lait d''amande sans sucre et 50g de fromage blanc.\n2. Laisser gonfler au frais (ou prêt à l''avance).\n3. Recouvrir d''un dôme de framboises et myrtilles fraîches avant de déguster.',
  ARRAY['quick', 'snack', 'fiber', 'superfood', 'satiety']::TEXT[],
  FALSE,
  TRUE,
  55
),
(
  'e2000001-0001-4000-8000-000000000036',
  'Chia pudding mangue & touche de lait de coco',
  'chia-pudding-mangue-coco',
  'snack',
  'maintenance',
  5,
  'Facile',
  210,
  11.0,
  20.0,
  9.5,
  '/images/recipes/chia-pudding-mangue.jpg',
  '1. Mélanger 20g de graines de chia avec 80ml de lait de coco léger et 50g de skyr/fromage blanc.\n2. Laisser poser pour obtenir une consistance de pudding onctueuse.\n3. Garnir d''une purée de mangue fraîche écrasée à la fourchette.',
  ARRAY['quick', 'snack', 'tropical', 'superfood']::TEXT[],
  FALSE,
  TRUE,
  56
),
(
  'e2000001-0001-4000-8000-000000000037',
  'Compote pomme sans sucre & Fromage blanc vanillé',
  'compote-fromage-blanc-vanille',
  'snack',
  'all',
  2,
  'Facile',
  170,
  20.0,
  20.0,
  1.0,
  '/images/recipes/compote-fb.jpg',
  '1. Dans un bol, alterner des couches de 200g de fromage blanc 0% et 100g de compote de pomme 100% pur fruit sans sucres ajoutés.\n2. Saupoudrer d''une touche de cannelle ou vanille.',
  ARRAY['high_protein', 'quick', 'snack', 'low_fat', 'digestible']::TEXT[],
  FALSE,
  TRUE,
  57
),
(
  'e2000001-0001-4000-8000-000000000038',
  'Banane écrasée, Fromage blanc onctueux & Beurre de cacahuète',
  'banane-fromage-blanc-beurre-cacahuete',
  'snack',
  'muscle_gain',
  3,
  'Facile',
  320,
  24.0,
  35.0,
  9.5,
  '/images/recipes/banane-fb-peanut.jpg',
  '1. Écraser 1/2 banane mûre à la fourchette dans un bol.\n2. Incorporer 200g de fromage blanc et 1 cuillère à café bombée (12g) de beurre de cacahuète pur.\n3. Mélanger pour obtenir une crème dessert gourmande et hyperprotéinée.',
  ARRAY['high_protein', 'quick', 'snack', 'muscle_gain', 'post_workout']::TEXT[],
  FALSE,
  TRUE,
  58
),
(
  'e2000001-0001-4000-8000-000000000039',
  'Shaker Isolate Fruits Rouges & Graines de Lin',
  'shaker-isolate-fruits-rouges-lin',
  'snack',
  'weight_loss',
  3,
  'Facile',
  220,
  28.0,
  14.0,
  4.5,
  '/images/recipes/shake-fruits-rouges.jpg',
  '1. Dans le shaker ou blender, verser 250ml d''eau très fraîche ou lait d''amande.\n2. Ajouter 30g de whey isolate, 80g de fruits rouges surgelés et 1 c.à.c de graines de lin moulues.\n3. Mixer 30 secondes pour une texture smoothie onctueuse.',
  ARRAY['high_protein', 'quick', 'snack', 'post_workout', 'low_calorie']::TEXT[],
  FALSE,
  TRUE,
  59
),
(
  'e2000001-0001-4000-8000-000000000040',
  'Smoothie Récupération Express Cacao, Avoine & Lait d''amande',
  'smoothie-recup-cacao-avoine',
  'snack',
  'recomposition',
  3,
  'Facile',
  270,
  25.0,
  30.0,
  4.5,
  '/images/recipes/smoothie-cacao-avoine.jpg',
  '1. Verser 250ml de lait d''amande dans un blender.\n2. Ajouter 25g de farine d''avoine instantanée, 1 dose de protéine (25g) et 1 c.à.c de cacao pur non sucré.\n3. Shaker énergiquement et consommer immédiatement après l''entraînement.',
  ARRAY['high_protein', 'quick', 'snack', 'post_workout']::TEXT[],
  FALSE,
  TRUE,
  60
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  target_goal = EXCLUDED.target_goal,
  prep_time_minutes = EXCLUDED.prep_time_minutes,
  difficulty = EXCLUDED.difficulty,
  calories = EXCLUDED.calories,
  proteins_g = EXCLUDED.proteins_g,
  carbs_g = EXCLUDED.carbs_g,
  fats_g = EXCLUDED.fats_g,
  instructions = EXCLUDED.instructions,
  tags = EXCLUDED.tags,
  is_premium = EXCLUDED.is_premium,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- 4. Insertion des Ingrédients précis pour les nouvelles recettes
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, display_order)
VALUES
  -- Fromage blanc fruits rouges & chia
  ('e2000001-0001-4000-8000-000000000001', 'Fromage blanc 0% ou 3%', 250, 'g', 1),
  ('e2000001-0001-4000-8000-000000000001', 'Mélange de fruits rouges frais/surgelés', 100, 'g', 2),
  ('e2000001-0001-4000-8000-000000000001', 'Graines de chia', 5, 'g', 3),

  -- Fromage blanc banane & peanut
  ('e2000001-0001-4000-8000-000000000002', 'Fromage blanc', 250, 'g', 1),
  ('e2000001-0001-4000-8000-000000000002', 'Banane mûre', 1, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000002', 'Beurre de cacahuète 100% pur', 15, 'g', 3),

  -- Fromage blanc pomme cannelle
  ('e2000001-0001-4000-8000-000000000003', 'Fromage blanc 0%', 250, 'g', 1),
  ('e2000001-0001-4000-8000-000000000003', 'Pomme fraîche croquante', 0.5, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000003', 'Cannelle moulue', 1, 'pincée', 3),

  -- Fromage blanc kiwi & granola
  ('e2000001-0001-4000-8000-000000000004', 'Fromage blanc', 250, 'g', 1),
  ('e2000001-0001-4000-8000-000000000004', 'Kiwi frais', 1, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000004', 'Granola avoine non sucré', 25, 'g', 3),

  -- Fromage blanc mangue & coco
  ('e2000001-0001-4000-8000-000000000005', 'Fromage blanc', 250, 'g', 1),
  ('e2000001-0001-4000-8000-000000000005', 'Mangue fraîche en dés', 80, 'g', 2),
  ('e2000001-0001-4000-8000-000000000005', 'Noix de coco râpée', 5, 'g', 3),

  -- Fromage blanc cacao & banane
  ('e2000001-0001-4000-8000-000000000006', 'Fromage blanc', 250, 'g', 1),
  ('e2000001-0001-4000-8000-000000000006', 'Cacao pur non sucré', 7, 'g', 2),
  ('e2000001-0001-4000-8000-000000000006', 'Banane mûre', 0.5, 'unité', 3),

  -- Porridge banane cannelle
  ('e2000001-0001-4000-8000-000000000007', 'Flocons d''avoine', 45, 'g', 1),
  ('e2000001-0001-4000-8000-000000000007', 'Lait d''amande ou écrémé', 180, 'ml', 2),
  ('e2000001-0001-4000-8000-000000000007', 'Banane', 0.5, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000007', 'Protéine en poudre ou skyr', 15, 'g', 4),

  -- Porridge fruits rouges chia
  ('e2000001-0001-4000-8000-000000000008', 'Flocons d''avoine', 40, 'g', 1),
  ('e2000001-0001-4000-8000-000000000008', 'Lait végétal', 160, 'ml', 2),
  ('e2000001-0001-4000-8000-000000000008', 'Graines de chia', 5, 'g', 3),
  ('e2000001-0001-4000-8000-000000000008', 'Fruits rouges variés', 100, 'g', 4),

  -- Porridge pomme cannelle
  ('e2000001-0001-4000-8000-000000000009', 'Flocons d''avoine', 45, 'g', 1),
  ('e2000001-0001-4000-8000-000000000009', 'Lait', 180, 'ml', 2),
  ('e2000001-0001-4000-8000-000000000009', 'Pomme fraîche', 0.5, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000009', 'Cannelle moulue', 1, 'c.à.c', 4),

  -- Porridge chocolat banane
  ('e2000001-0001-4000-8000-000000000010', 'Flocons d''avoine', 50, 'g', 1),
  ('e2000001-0001-4000-8000-000000000010', 'Lait', 200, 'ml', 2),
  ('e2000001-0001-4000-8000-000000000010', 'Chocolat noir 85%', 10, 'g', 3),
  ('e2000001-0001-4000-8000-000000000010', 'Banane mûre', 1, 'unité', 4),

  -- Pancakes avoine banane
  ('e2000001-0001-4000-8000-000000000011', 'Banane mûre', 1, 'unité', 1),
  ('e2000001-0001-4000-8000-000000000011', 'Œufs entiers plein air', 2, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000011', 'Flocons d''avoine mixés', 40, 'g', 3),

  -- Pancakes fromage blanc vanille
  ('e2000001-0001-4000-8000-000000000012', 'Fromage blanc 0%', 150, 'g', 1),
  ('e2000001-0001-4000-8000-000000000012', 'Œuf entier', 1, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000012', 'Blanc d''œuf', 1, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000012', 'Farine complète', 30, 'g', 4),

  -- Pancakes myrtilles coulis
  ('e2000001-0001-4000-8000-000000000013', 'Skyr ou fromage blanc', 100, 'g', 1),
  ('e2000001-0001-4000-8000-000000000013', 'Œuf entier', 1, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000013', 'Farine d''avoine', 35, 'g', 3),
  ('e2000001-0001-4000-8000-000000000013', 'Myrtilles fraîches', 50, 'g', 4),
  ('e2000001-0001-4000-8000-000000000013', 'Framboises fraîches (coulis)', 40, 'g', 5),

  -- Tartine avocat œuf
  ('e2000001-0001-4000-8000-000000000014', 'Pain complet au levain', 50, 'g', 1),
  ('e2000001-0001-4000-8000-000000000014', 'Avocat mûr', 0.33, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000014', 'Œuf plein air mollet/poché', 1, 'unité', 3),

  -- Tartine saumon fromage frais
  ('e2000001-0001-4000-8000-000000000015', 'Pain de seigle ou complet', 50, 'g', 1),
  ('e2000001-0001-4000-8000-000000000015', 'Fromage frais allégé', 30, 'g', 2),
  ('e2000001-0001-4000-8000-000000000015', 'Saumon fumé de qualité', 60, 'g', 3),
  ('e2000001-0001-4000-8000-000000000015', 'Aneth fraîche & jus de citron', 1, 'portion', 4),

  -- Tartine banane peanut
  ('e2000001-0001-4000-8000-000000000016', 'Pain complet aux céréales', 50, 'g', 1),
  ('e2000001-0001-4000-8000-000000000016', 'Beurre de cacahuète pur', 20, 'g', 2),
  ('e2000001-0001-4000-8000-000000000016', 'Banane', 0.5, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000016', 'Graines de chanvre/courge', 5, 'g', 4),

  -- Tartine ricotta fruits frais
  ('e2000001-0001-4000-8000-000000000017', 'Pain complet croustillant', 50, 'g', 1),
  ('e2000001-0001-4000-8000-000000000017', 'Ricotta fraîche', 40, 'g', 2),
  ('e2000001-0001-4000-8000-000000000017', 'Fraises fraîches émincées', 60, 'g', 3),
  ('e2000001-0001-4000-8000-000000000017', 'Miel d''acacia', 5, 'g', 4),

  -- Bowl Poulet Quinoa Roquette
  ('e2000001-0001-4000-8000-000000000018', 'Filet de poulet', 150, 'g', 1),
  ('e2000001-0001-4000-8000-000000000018', 'Quinoa cru', 60, 'g', 2),
  ('e2000001-0001-4000-8000-000000000018', 'Pousses de roquette', 40, 'g', 3),
  ('e2000001-0001-4000-8000-000000000018', 'Tomates cerises', 80, 'g', 4),
  ('e2000001-0001-4000-8000-000000000018', 'Huile d''olive vierge', 5, 'ml', 5),

  -- Bowl Saumon Avocat Riz Fèves
  ('e2000001-0001-4000-8000-000000000019', 'Pavé de saumon frais', 130, 'g', 1),
  ('e2000001-0001-4000-8000-000000000019', 'Riz basmati cru', 60, 'g', 2),
  ('e2000001-0001-4000-8000-000000000019', 'Avocat', 0.33, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000019', 'Fèves fraîches ou edamame', 50, 'g', 4),
  ('e2000001-0001-4000-8000-000000000019', 'Sauce soja & graines de sésame', 10, 'ml', 5),

  -- Pasta bowl thon mâche
  ('e2000001-0001-4000-8000-000000000020', 'Pâtes complètes crues', 60, 'g', 1),
  ('e2000001-0001-4000-8000-000000000020', 'Thon au naturel égoutté', 130, 'g', 2),
  ('e2000001-0001-4000-8000-000000000020', 'Mâche fraîche', 40, 'g', 3),
  ('e2000001-0001-4000-8000-000000000020', 'Concombre en dés', 60, 'g', 4),
  ('e2000001-0001-4000-8000-000000000020', 'Olives noires', 5, 'unité', 5),

  -- Chicken pesto bowl
  ('e2000001-0001-4000-8000-000000000021', 'Filet de poulet', 150, 'g', 1),
  ('e2000001-0001-4000-8000-000000000021', 'Riz complet cru', 65, 'g', 2),
  ('e2000001-0001-4000-8000-000000000021', 'Pesto vert au basilic', 15, 'g', 3),
  ('e2000001-0001-4000-8000-000000000021', 'Pousses d''épinards frais', 40, 'g', 4),
  ('e2000001-0001-4000-8000-000000000021', 'Pétales de tomates séchées', 4, 'unité', 5),

  -- Bowl thon riz complet concombre
  ('e2000001-0001-4000-8000-000000000022', 'Thon au naturel égoutté', 130, 'g', 1),
  ('e2000001-0001-4000-8000-000000000022', 'Riz complet cuit', 130, 'g', 2),
  ('e2000001-0001-4000-8000-000000000022', 'Concombre croquant', 80, 'g', 3),
  ('e2000001-0001-4000-8000-000000000022', 'Maïs doux égoutté', 40, 'g', 4),
  ('e2000001-0001-4000-8000-000000000022', 'Mesclun croquant', 40, 'g', 5),

  -- Salade poulet mâche roquette pomme
  ('e2000001-0001-4000-8000-000000000023', 'Escalope de poulet', 160, 'g', 1),
  ('e2000001-0001-4000-8000-000000000023', 'Mélange mâche & roquette', 60, 'g', 2),
  ('e2000001-0001-4000-8000-000000000023', 'Pomme acidulée en lamelles', 0.5, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000023', 'Cerneaux de noix concassés', 15, 'g', 4),

  -- Bowl saumon quinoa radis
  ('e2000001-0001-4000-8000-000000000024', 'Pavé de saumon frais', 140, 'g', 1),
  ('e2000001-0001-4000-8000-000000000024', 'Quinoa cru', 50, 'g', 2),
  ('e2000001-0001-4000-8000-000000000024', 'Pousses d''épinards frais', 50, 'g', 3),
  ('e2000001-0001-4000-8000-000000000024', 'Radis croquants', 4, 'unité', 4),

  -- Bowl végétarien pois chiches feta
  ('e2000001-0001-4000-8000-000000000025', 'Pois chiches cuits', 120, 'g', 1),
  ('e2000001-0001-4000-8000-000000000025', 'Feta grecque AOP', 40, 'g', 2),
  ('e2000001-0001-4000-8000-000000000025', 'Quinoa cru', 50, 'g', 3),
  ('e2000001-0001-4000-8000-000000000025', 'Mesclun frais', 40, 'g', 4),
  ('e2000001-0001-4000-8000-000000000025', 'Tomates cerises & concombre', 80, 'g', 5),

  -- Salade crevettes avocat agrumes
  ('e2000001-0001-4000-8000-000000000026', 'Crevettes fraîches décortiquées', 160, 'g', 1),
  ('e2000001-0001-4000-8000-000000000026', 'Avocat mûr', 0.33, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000026', 'Mâche fraîche', 50, 'g', 3),
  ('e2000001-0001-4000-8000-000000000026', 'Pamplemousse rose (suprêmes)', 0.5, 'unité', 4),

  -- Bowl bœuf riz courgettes
  ('e2000001-0001-4000-8000-000000000027', 'Bœuf émincé 5% MG', 150, 'g', 1),
  ('e2000001-0001-4000-8000-000000000027', 'Riz basmati cru', 60, 'g', 2),
  ('e2000001-0001-4000-8000-000000000027', 'Courgette vapeur', 1, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000027', 'Sauce soja & gingembre frais', 10, 'ml', 4),

  -- Salade mozza poulet roquette
  ('e2000001-0001-4000-8000-000000000028', 'Blanc de poulet grillé', 150, 'g', 1),
  ('e2000001-0001-4000-8000-000000000028', 'Mozzarella di Bufala', 60, 'g', 2),
  ('e2000001-0001-4000-8000-000000000028', 'Pousses de roquette', 50, 'g', 3),
  ('e2000001-0001-4000-8000-000000000028', 'Tomates cerises', 100, 'g', 4),

  -- Bowl cabillaud patate douce épinards
  ('e2000001-0001-4000-8000-000000000029', 'Dos de cabillaud frais', 160, 'g', 1),
  ('e2000001-0001-4000-8000-000000000029', 'Patate douce en cubes', 160, 'g', 2),
  ('e2000001-0001-4000-8000-000000000029', 'Pousses d''épinards frais', 60, 'g', 3),
  ('e2000001-0001-4000-8000-000000000029', 'Huile d''olive vierge', 5, 'ml', 4),

  -- FB cheesecake
  ('e2000001-0001-4000-8000-000000000030', 'Fromage blanc 0%', 200, 'g', 1),
  ('e2000001-0001-4000-8000-000000000030', 'Framboises fraîches/surgelées', 60, 'g', 2),
  ('e2000001-0001-4000-8000-000000000030', 'Sablé complet ou spéculoos', 12, 'g', 3),

  -- FB tiramisu
  ('e2000001-0001-4000-8000-000000000031', 'Fromage blanc', 200, 'g', 1),
  ('e2000001-0001-4000-8000-000000000031', 'Expresso serré', 30, 'ml', 2),
  ('e2000001-0001-4000-8000-000000000031', 'Biscuit cuillère', 1, 'unité', 3),
  ('e2000001-0001-4000-8000-000000000031', 'Cacao pur 100%', 5, 'g', 4),

  -- FB pomme rôtie
  ('e2000001-0001-4000-8000-000000000032', 'Fromage blanc 0%', 200, 'g', 1),
  ('e2000001-0001-4000-8000-000000000032', 'Pomme en dés', 0.5, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000032', 'Cannelle moulue', 1, 'c.à.c', 3),

  -- Yaourt grec kiwi noix
  ('e2000001-0001-4000-8000-000000000033', 'Yaourt grec authentique', 170, 'g', 1),
  ('e2000001-0001-4000-8000-000000000033', 'Kiwi frais', 1, 'unité', 2),
  ('e2000001-0001-4000-8000-000000000033', 'Noix de Grenoble', 15, 'g', 3),

  -- Yaourt grec mangue coco
  ('e2000001-0001-4000-8000-000000000034', 'Yaourt grec', 170, 'g', 1),
  ('e2000001-0001-4000-8000-000000000034', 'Mangue fraîche', 70, 'g', 2),
  ('e2000001-0001-4000-8000-000000000034', 'Noix de coco râpée', 5, 'g', 3),

  -- Chia pudding fruits rouges
  ('e2000001-0001-4000-8000-000000000035', 'Graines de chia', 20, 'g', 1),
  ('e2000001-0001-4000-8000-000000000035', 'Lait d''amande sans sucre', 120, 'ml', 2),
  ('e2000001-0001-4000-8000-000000000035', 'Fromage blanc 0%', 50, 'g', 3),
  ('e2000001-0001-4000-8000-000000000035', 'Fruits rouges frais', 50, 'g', 4),

  -- Chia pudding mangue coco
  ('e2000001-0001-4000-8000-000000000036', 'Graines de chia', 20, 'g', 1),
  ('e2000001-0001-4000-8000-000000000036', 'Lait de coco léger', 80, 'ml', 2),
  ('e2000001-0001-4000-8000-000000000036', 'Skyr ou fromage blanc', 50, 'g', 3),
  ('e2000001-0001-4000-8000-000000000036', 'Mangue fraîche écrasée', 60, 'g', 4),

  -- Compote FB vanille
  ('e2000001-0001-4000-8000-000000000037', 'Fromage blanc 0%', 200, 'g', 1),
  ('e2000001-0001-4000-8000-000000000037', 'Compote de pomme sans sucre', 100, 'g', 2),
  ('e2000001-0001-4000-8000-000000000037', 'Extrait de vanille naturelle', 1, 'dose', 3),

  -- Banane FB peanut
  ('e2000001-0001-4000-8000-000000000038', 'Banane mûre', 0.5, 'unité', 1),
  ('e2000001-0001-4000-8000-000000000038', 'Fromage blanc', 200, 'g', 2),
  ('e2000001-0001-4000-8000-000000000038', 'Beurre de cacahuète pur', 12, 'g', 3),

  -- Shaker Isolate fruits rouges lin
  ('e2000001-0001-4000-8000-000000000039', 'Whey Isolate', 30, 'g', 1),
  ('e2000001-0001-4000-8000-000000000039', 'Fruits rouges surgelés', 80, 'g', 2),
  ('e2000001-0001-4000-8000-000000000039', 'Graines de lin moulues', 5, 'g', 3),
  ('e2000001-0001-4000-8000-000000000039', 'Eau fraîche ou lait d''amande', 250, 'ml', 4),

  -- Smoothie avoine cacao
  ('e2000001-0001-4000-8000-000000000040', 'Lait d''amande', 250, 'ml', 1),
  ('e2000001-0001-4000-8000-000000000040', 'Farine d''avoine instantanée', 25, 'g', 2),
  ('e2000001-0001-4000-8000-000000000040', 'Protéine en poudre vanille/chocolat', 25, 'g', 3),
  ('e2000001-0001-4000-8000-000000000040', 'Cacao pur non sucré', 5, 'g', 4)
ON CONFLICT DO NOTHING;

COMMIT;
