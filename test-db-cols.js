const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function checkColumns() {
    const { data: riData, error: riError } = await supabase.from('recipe_interactions').select('*').limit(1);
    console.log("recipe_interactions error:", riError);
    // Let's insert a row and see if it fails to see columns
    const { data, error } = await supabase.from('recipe_interactions').insert({ interaction_type: 'test' }).select();
    console.log("insert error:", error);
}
checkColumns();
