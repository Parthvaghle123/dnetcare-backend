const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize("postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true", { logging: false });

const WebsiteConfig = sequelize.define('WebsiteConfig', {
  organization_id: DataTypes.UUID,
  template_id: DataTypes.STRING,
  branding: DataTypes.JSONB,
  hero_section: DataTypes.JSONB,
  stats_section: DataTypes.JSONB,
  about_section: DataTypes.JSONB,
  services_section: DataTypes.JSONB,
  gallery_section: DataTypes.JSONB,
  doctors_section: DataTypes.JSONB,
  contact_section: DataTypes.JSONB,
}, { tableName: 'website_configs', timestamps: false });

async function run() {
  const configs = await WebsiteConfig.findAll();
  console.log(JSON.stringify(configs, null, 2));
  process.exit(0);
}
run();
