require('dotenv').config();

async function run() {
  const { Sequelize, DataTypes } = require('sequelize');
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { rejectUnauthorized: false } },
    logging: false
  });
  
  const User = sequelize.define('users', {
    id: { type: DataTypes.UUID, primaryKey: true },
    email: DataTypes.STRING,
    role: DataTypes.STRING,
    status: DataTypes.STRING,
    organization_id: DataTypes.UUID
  }, { timestamps: false });

  const owner = await User.findOne({ where: { role: 'OWNER' } });
  if (owner) {
    console.log("OWNER found:", owner.email, owner.role, owner.status);
  } else {
    console.log("No owner found!");
  }
}

run().catch(console.error);
