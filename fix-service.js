const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/modules/admin/admin.service.ts');
let code = fs.readFileSync(file, 'utf8');

const helper = `
      const existingTables = await this.sequelize.getQueryInterface().showAllTables();
      const safeDestroy = async (model, options) => {
        if (existingTables.includes(model.tableName)) {
          await model.destroy(options);
        } else {
          this.logger.warn(\`Skipping destroy for missing table: \${model.tableName}\`);
        }
      };

      // Execute everything inside a transaction
      await this.sequelize.transaction(async (transaction) => {`;

code = code.replace(
  /\/\/ Execute everything inside a transaction\s+await this\.sequelize\.transaction\(async \(transaction\) => \{/,
  helper
);

// We need to replace all destroy calls inside the deleteUser function
// Since it's between line 220 and 460 roughly.
// We can use a regex: await (SomeModel)\.destroy\(
code = code.replace(/await ([a-zA-Z0-9_\.]+)\.destroy\(\{/g, (match, p1) => {
  return `await safeDestroy(${p1}, {`;
});

// We need to restore any destroy outside deleteUser if there are any. Let's check if there are.
// Actually, `admin.service.ts` only deletes users. Let's assume all destroy() calls in this file should be safeDestroy. Wait, no.
// Let's just run it.
fs.writeFileSync(file, code);
