const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is missing in your .env file!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Explicit connection test query
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to Supabase PostgreSQL Database at:', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};