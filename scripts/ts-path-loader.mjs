// Loader de resolución de módulos para scripts TypeScript locales.
//
// Resuelve el alias `@/` (mapeado a `src/`) para poder ejecutar scripts .ts con
// Node directamente (type stripping) sin depender de ts-node/tsx ni agregar deps.
//
// Uso:
//   node --import ./scripts/ts-path-loader.mjs scripts/seed-local.ts
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(process.cwd());
const srcDir = path.join(root, 'src');

const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs'];

function resolveCandidate(base) {
  for (const ext of EXTENSIONS) {
    if (fs.existsSync(base + ext)) {
      return base + ext;
    }
  }
  if (fs.existsSync(path.join(base, 'index.ts'))) {
    return path.join(base, 'index.ts');
  }
  if (fs.existsSync(path.join(base, 'index.tsx'))) {
    return path.join(base, 'index.tsx');
  }
  return null;
}

const typesDirUrl = pathToFileURL(path.join(srcDir, 'types')).href;

let typesShimSource = null;

function getTypesShimSource() {
  if (typesShimSource === null) {
    const indexPath = path.join(srcDir, 'types', 'index.ts');
    let source = '';
    try {
      source = fs.readFileSync(indexPath, 'utf8');
    } catch {
      typesShimSource = 'export {};';
      return typesShimSource;
    }

    const names = new Set();
    for (const match of source.matchAll(/^export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/gm)) {
      names.add(match[1]);
    }
    const lines = [...names].map((name) => `export const ${name} = undefined;`);
    typesShimSource = `${lines.join('\n')}\nexport {};`;
  }
  return typesShimSource;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const clean = specifier.slice(2);
      const base = path.join(srcDir, clean);
      const found = resolveCandidate(base);

      if (found) {
        return nextResolve(pathToFileURL(found).href, context);
      }
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(typesDirUrl)) {
      return {
        format: 'module',
        source: getTypesShimSource(),
        shortCircuit: true,
      };
    }

    return nextLoad(url, context);
  },
});