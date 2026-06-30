-- Create recipe_translations table for on-demand AI translation caching
CREATE TABLE IF NOT EXISTS public.recipe_translations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  language varchar(20) NOT NULL, -- e.g., 'ur', 'roman_ur'
  translated_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(recipe_id, language)
);

-- RLS policies
ALTER TABLE public.recipe_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON public.recipe_translations
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON public.recipe_translations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
