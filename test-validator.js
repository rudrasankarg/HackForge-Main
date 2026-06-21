const { validateUniversity } = require('./backend/src/services/universityValidator');
require('dotenv').config({ path: './backend/.env' });
require('dotenv').config({ path: './.env' });

async function run() {
  console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
  const res = await validateUniversity("Meghnad Saha");
  console.log("Result:", res);
}

run();
