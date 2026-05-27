import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../../legal');
const dest = join(here, '../legal');

if (existsSync(src)) {
  cpSync(src, dest, { recursive: true, force: true });
}
