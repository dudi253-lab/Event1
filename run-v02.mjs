import fs from 'node:fs';
import pg from 'pg';

const { Client } = pg;
const sql = fs.readFileSync('supabase/v0.2.sql', 'utf8');

function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode?.(true);
    let value = '';
    const onData = (chunk) => {
      const char = chunk.toString();
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode?.(false);
        process.stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (char === '\u0003') process.exit(130);
      if (char === '\u007f') {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };
    process.stdin.on('data', onData);
  });
}

const password = await askHidden('Supabase database password: ');

const client = new Client({
  host: 'aws-0-eu-central-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.fhlirqpqqvaudhighkww',
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

try {
  console.log('Connecting to Supabase via Session Pooler…');
  await client.connect();
  console.log('Connected. Running supabase/v0.2.sql…');
  await client.query(sql);
  console.log('✅ v0.2 database setup completed successfully.');
} catch (error) {
  console.error('❌ Database setup failed.');
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
