import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from .env.local (clone) or .env.upload (sibling Brams-Score repo)
function loadEnv() {
  const candidates = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '..', 'Brams-Score-By-Freydiss', '.env.upload'),
    path.join(__dirname, '..', '..', 'Brams-Score-By-Freydiss', '.env'),
    '.env.upload',
    '.env'
  ];
  const env = {};
  for (const p of candidates) {
    try {
      const content = require('fs').readFileSync(p, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
let SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL or key. Put SERVICE_KEY in .env.upload or set SUPABASE_SERVICE_KEY env var.');
  process.exit(1);
}

const isService = !!env.SUPABASE_SERVICE_KEY || !!env.SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = 'scans';

// Map slug -> local folder name under public/scans or F:\Manga\TPN
const SLUG_TO_LOCAL = {
  fireforce: 'Fire Force',
  bluelock: 'Blue Lock',
  aot: 'Attaque des titans',
  bc: 'Black Clover',
  jjk: 'Jujutsu Kaisen',
  kny: 'Kimetsu No Yaiba',
  kingdom: 'Kingdom',
  nnt: 'Nanatsu no Taizai',
  sl: 'Solo Leveling',
  mha: 'My Hero Academia',
  drstone: 'Dr. Stone',
  tpn: 'The Promised Neverland'
};

async function ensureBucket() {
  if (!isService) return;
  try {
    await supabase.storage.createBucket(BUCKET, { public: true });
    console.log('Bucket created');
  } catch (e) {
    if (!/already exists|409/.test(e.message)) console.log('Bucket ensure:', e.message);
  }
}

async function uploadAnime(slug) {
  const localName = SLUG_TO_LOCAL[slug];
  if (!localName) { console.error('Unknown slug', slug); return; }

  // Prefer local public/scans copy, fallback to F: raw
  let root = path.join(__dirname, '..', 'public', 'scans', slug);
  try { await fs.access(root); } catch {
    root = path.join('F:\\Manga\\TPN', localName);
    try { await fs.access(root); } catch {
      console.error('No local data for', slug);
      return;
    }
  }

  console.log(`\n=== ${slug} (${localName}) from ${root} ===`);
  await ensureBucket();

  const chDirs = (await fs.readdir(root, { withFileTypes: true })).filter(d => d.isDirectory());
  const chapters = [];

  for (const d of chDirs.sort((a, b) => parseInt(a.name) - parseInt(b.name))) {
    const num = parseInt(d.name);
    if (isNaN(num)) continue;
    const chPath = path.join(root, d.name);
    const files = (await fs.readdir(chPath)).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

    const pages = [];
    for (const img of files) {
      const full = path.join(chPath, img);
      const objPath = `scans/${slug}/ch${num}/${img}`;
      const buf = await fs.readFile(full);
      const ct = img.endsWith('.png') ? 'image/png' : img.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

      const { error } = await supabase.storage.from(BUCKET).upload(objPath, buf, { contentType: ct, upsert: true });
      if (error) {
        console.error('  ERR', objPath, error.message);
      } else {
        pages.push(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objPath}`);
      }
    }
    if (pages.length) {
      chapters.push({ num: String(num), title: `Chapitre ${num}`, pages });
      console.log(`  ch${num}: ${pages.length} pages`);
    }
  }

  chapters.sort((a,b) => +a.num - +b.num);

  const jsonPath = `src/data/${slug}-chapters.json`;
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(chapters, null, 2));
  console.log(`✅ ${chapters.length} chapters → ${jsonPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/upload-pc-scans.mjs <slug> [slug2 ...] | all');
    console.log('Available slugs:', Object.keys(SLUG_TO_LOCAL).join(', '));
    return;
  }
  const targets = args[0].toLowerCase() === 'all' ? Object.keys(SLUG_TO_LOCAL) : args;
  for (const t of targets) {
    await uploadAnime(t);
  }
  console.log('\nDone. If using service key, images are in the bucket and JSONs updated.');
}

main().catch(console.error);
