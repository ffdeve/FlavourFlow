const https = require('https');
require('dotenv').config();
const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`;
https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
