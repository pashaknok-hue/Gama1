import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const [packageRoot, output] = process.argv.slice(2);
if (!packageRoot || !output) throw new Error('Usage: node export-locales.mjs <package-root> <output.json>');
const { allLocales } = await import(pathToFileURL(path.join(packageRoot, 'node_modules/@faker-js/faker/dist/index.js')));
fs.writeFileSync(output, JSON.stringify(allLocales));
