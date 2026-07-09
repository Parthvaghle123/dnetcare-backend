const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: "postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS internship_inquiries (
        id UUID PRIMARY KEY,
        organization_id UUID,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(255) NOT NULL,
        qualification VARCHAR(255) NOT NULL,
        description TEXT,
        profile_image_url VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Created internship_inquiries table successfully.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    await client.end();
  }
};

run();
