-- Remove duplicate urdu columns to reduce DB bloat and payload sizes
ALTER TABLE IF EXISTS public.recipes DROP COLUMN IF EXISTS title_urdu;
ALTER TABLE IF EXISTS public.recipe_ingredients DROP COLUMN IF EXISTS name_urdu;
ALTER TABLE IF EXISTS public.recipe_steps DROP COLUMN IF EXISTS instruction_urdu;
ALTER TABLE IF EXISTS public.cuisine_catalog DROP COLUMN IF EXISTS name_urdu;
ALTER TABLE IF EXISTS public.ingredients DROP COLUMN IF EXISTS name_urdu;
