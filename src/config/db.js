const { Pool } = require('pg');

const pool = new Pool({
    connectionString: `postgresql://postgres.wldwgqnabieyyamwjliy:xa9huHyULG6yQLYT@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres`,
})

module.exports = pool;
