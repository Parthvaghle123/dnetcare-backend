const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/dental_doctor');
async function run() {
  const tables = await sequelize.getQueryInterface().showAllTables();
  console.log(tables);
  process.exit(0);
}
run();
