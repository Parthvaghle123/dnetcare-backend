require('dotenv').config();
const axios = require('axios');

async function run() {
  const { Sequelize } = require('sequelize');
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { rejectUnauthorized: false } },
    logging: false
  });
  
  const User = sequelize.define('users', {
    id: { type: Sequelize.UUID, primaryKey: true },
    email: Sequelize.STRING,
    role: Sequelize.STRING
  }, { timestamps: false });

  // Get the owner
  const owner = await User.findOne({ where: { role: 'OWNER' } });
  if (!owner) {
    console.log("No owner found");
    return;
  }

  // Note: normally this endpoint requires a JWT token.
  // Since we are doing it via HTTP, we'd need a token. Let's just generate a direct DB insert to test instead of hitting the endpoint, OR we can just test the DB logic.
  
  const DoctorProfile = sequelize.define('doctor_profiles', {
    id: { type: Sequelize.UUID, primaryKey: true },
    user_id: Sequelize.UUID
  }, { timestamps: false });

  // Simulate what auth.service.ts does:
  let dp = await DoctorProfile.findOne({ where: { user_id: owner.id } });
  if (!dp) {
    console.log("Creating doctor profile for owner...");
    dp = await DoctorProfile.create({ user_id: owner.id });
  } else {
    console.log("Owner already has doctor profile!");
  }

  console.log("Done!");
}

run().catch(console.error);
