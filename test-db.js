const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function checkTables() {
    const { data: f2Data, error: f2Error } = await supabase.from('favorites').select('*').limit(1);
    console.log("favorites table:", f2Error ? f2Error.message : "Exists, columns: " + (f2Data[0] ? Object.keys(f2Data[0]).join(', ') : "empty table"));

    const { data: FData, error: FError } = await supabase.from('Favorites').select('*').limit(1);
    console.log("Favorites table:", FError ? FError.message : "Exists, columns: " + (FData[0] ? Object.keys(FData[0]).join(', ') : "empty table"));

    const { data: lData, error: lError } = await supabase.from('likes').select('*').limit(1);
    console.log("likes table:", lError ? lError.message : "Exists, columns: " + (lData[0] ? Object.keys(lData[0]).join(', ') : "empty table"));

    const { data: riData, error: riError } = await supabase.from('recipe_interactions').select('*').limit(1);
    console.log("recipe_interactions table:", riError ? riError.message : "Exists, columns: " + (riData[0] ? Object.keys(riData[0]).join(', ') : "empty table"));
}
checkTables();
