import fs from 'node:fs';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

function askHidden(prompt) {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    let value = '';

    output.write(prompt);
    input.resume();
    input.setEncoding('utf8');
    if (input.isTTY && input.setRawMode) input.setRawMode(true);

    const onData = (char) => {
      if (char === '\u0003') process.exit(130);
      if (char === '\r' || char === '\n') {
        if (input.isTTY && input.setRawMode) input.setRawMode(false);
        input.pause();
        input.off('data', onData);
        output.write('\n');
        resolve(value);
        return;
      }
      if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };

    input.on('data', onData);
  });
}

const password = await askHidden('Supabase database password: ');
const sql = fs.readFileSync(new URL('./supabase/v0.3.sql', import.meta.url), 'utf8');

const client = new Client({
  host: 'aws-0-eu-central-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.fhlirqpqqvaudhighkww',
  password,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log('Connecting to Supabase via Session Pooler…');
  await client.connect();
  console.log('Connected. Running supabase/v0.3.sql…');
  await client.query(sql);
  console.log('✅ Digi v0.3 database setup completed successfully.');
} catch (error) {
  console.error('❌ Digi v0.3 database setup failed.');
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
