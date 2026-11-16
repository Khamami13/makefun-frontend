// Entry point of this make.fun frontend (Node 22, standard library only).
//
// The app itself is the static files under app/ next to this file: plain
// HTML, ES modules and CSS with no build step, reading make.fun's public API
// at https://make.fun/api. This program hands the entry in: it copies app/
// and screenshots/ from beside this file into the output directory and
// writes dossier.json there, the summary the judge reads, using the vendored
// make.fun library. Leave vendor/makefun-frontend.ts untouched: the scorer
// rebuilds the dossier with its own copy and requires a byte-for-byte match.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The gate's caps, as the kit states them: at most 3 screenshots of at most
// 256 KiB each, app/ at most 993 files and directories and 16 MiB in all.
// text_max_bytes caps the dossier's text at 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);

console.log(`Wrote ${outputDir}/dossier.json, ${outputDir}/app and ${outputDir}/screenshots`);
