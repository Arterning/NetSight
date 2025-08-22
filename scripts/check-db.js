/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const chalk = require('chalk');
const { execSync } = require('child_process');

if (process.env.SKIP_DB_CHECK) {
  console.log('Skipping database check.');
  process.exit(0);
}


const prisma = new PrismaClient();

async function applyMigration() {
  if (!process.env.SKIP_DB_MIGRATION) {
    console.log(execSync("prisma migrate deploy").toString());

    success("Database is up to date.");
  }
}

function error(msg) {
    console.log(chalk.redBright(`✗ ${msg}`));
}
  

(async () => {
  let err = false;
  for (let fn of [applyMigration]) {
    try {
      await fn();
    } catch (e) {
      error(e.message);
      err = true;
    } finally {
      await prisma.$disconnect();
      if (err) {
        process.exit(1);
      }
    }
  }
})();
