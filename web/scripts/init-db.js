'use strict';

const db = require('../db');

(async () => {
  // First call to any db method will run the schema.
  await db.all('SELECT 1');
  console.log('Database initialised at', db.name);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
