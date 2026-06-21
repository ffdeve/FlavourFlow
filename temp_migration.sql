ALTER TABLE recipe_interactions DROP CONSTRAINT IF EXISTS check_interaction_type;
ALTER TABLE recipe_interactions DROP CONSTRAINT IF EXISTS recipe_interactions_interaction_type_check;
ALTER TABLE recipe_interactions ADD CONSTRAINT check_interaction_type CHECK (
  interaction_type IN (
    'VIEW',
    'COOK_START',
    'COOK_COMPLETE',
    'COOK_ABANDONED',
    'FAVORITE',
    'SEARCH_CLICK',
    'SHARE',
    'RECIPE_IMPRESSION'
  )
);

CREATE TABLE IF NOT EXISTS recipe_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  score float DEFAULT 0,
  trend_score float DEFAULT 0,
  behavior_score float DEFAULT 0,
  content_score float DEFAULT 0,
  negative_penalty float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_recipe_recs_user_section ON recipe_recommendations(user_id, section_type);

ALTER TABLE recipe_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own recommendations" ON recipe_recommendations;
CREATE POLICY "Users can read their own recommendations"
  ON recipe_recommendations FOR SELECT
  USING (auth.uid() = user_id);
