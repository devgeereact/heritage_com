#!/usr/bin/env node
/**
 * HeritOS release manifest (A02). Writes release-manifest.json: the SHA-256 of
 * every server file a release needs, marked `ci` (copied into dist/ by
 * .github/workflows/deploy.yml) or `manual` (uploaded by hand in cPanel), plus
 * every schema file with its hash and one marker table or column that shows
 * whether the live database has that phase.
 *
 *   npm run release:manifest                 writes ./release-manifest.json
 *   npm run release:manifest -- --out FILE   writes FILE instead
 *
 * The owner copies the file to the server OUTSIDE the document root and runs
 * php-api/release_check.php against it (docs/DEPLOYMENT.md, Release procedure).
 * It holds file names and hashes only, no secrets, but it is never published:
 * it stays out of dist/ and php-api/.htaccess denies it by name.
 *
 * No dependencies beyond Node itself. The deploy list is read from deploy.yml,
 * so the manifest cannot drift from what CI really uploads.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const MANIFEST_FORMAT = 1

/**
 * One marker per schema file: a table or column that file creates and nothing
 * earlier creates (checked against schema.sql and schema_modules.sql, 18
 * October 2026). `type_contains` means the column type must contain that text
 * (phase 28 widens an ENUM); `setting` means a settings row with that key.
 */
export const SCHEMA_MARKERS = {
  'schema.sql': { table: 'users' },
  'schema_modules.sql': null,
  'schema_phase2.sql': { table: 'orders', column: 'tracking_ref' },
  'schema_phase3.sql': { table: 'whatsapp_messages' },
  'schema_phase4.sql': { table: 'tailoring_orders', column: 'fabric_cost' },
  'schema_phase5.sql': { table: 'coupons' },
  'schema_phase6.sql': { table: 'gift_cards' },
  'schema_phase7.sql': { table: 'customers', column: 'referral_code' },
  'schema_phase8.sql': { table: 'abandoned_carts' },
  'schema_phase9.sql': { table: 'customer_tokens' },
  'schema_phase10.sql': { table: 'reviews' },
  'schema_phase11.sql': { table: 'products', column: 'slug' },
  'schema_phase12.sql': { table: 'users', column: 'pin_hash' },
  'schema_phase13.sql': { table: 'tailoring_groups' },
  'schema_phase14.sql': { table: 'wishlist_items' },
  'schema_phase15.sql': { table: 'nps_responses' },
  'schema_phase16.sql': { table: 'blog_posts' },
  'schema_phase17.sql': { table: 'tailoring_orders', column: 'public_ref' },
  'schema_phase18.sql': { table: 'enquiries', column: 'conversion_key' },
  'schema_phase19.sql': { table: 'measurement_sets' },
  'schema_phase20.sql': { table: 'quotes' },
  'schema_phase21.sql': { table: 'job_payments' },
  'schema_phase22.sql': { table: 'job_handovers' },
  'schema_phase23.sql': { table: 'appointments' },
  'schema_phase24.sql': { table: 'customer_sessions' },
  'schema_phase25.sql': { table: 'job_messages' },
  'schema_phase26.sql': { table: 'cms_items' },
  'schema_phase27.sql': { table: 'companies' },
  'schema_phase28.sql': { table: 'cms_items', column: 'entity', type_contains: "'slide'" },
  'schema_phase29.sql': { table: 'password_resets' },
  'schema_phase30.sql': { setting: 'retention_expired_tokens_days' },
  'schema_phase31.sql': { table: 'usage_daily' },
}

/** File names copied into dist/ by deploy.yml (`cp php-api/NAME dist/`), comments ignored. */
export function parseDeployList(yamlText) {
  const names = []
  for (const raw of yamlText.split('\n')) {
    const line = raw.replace(/#.*$/, '')
    const m = line.match(/^\s*cp\s+php-api\/([A-Za-z0-9_.-]+)\s+dist\/?\s*$/)
    if (m && !names.includes(m[1])) names.push(m[1])
  }
  return names
}

/** Server files a release needs: tracked php-api/*.php except config files, plus .htaccess. */
export function serverFiles(trackedPaths) {
  return trackedPaths
    .filter((p) => /^php-api\/[^/]+\.php$/.test(p) && !/^php-api\/config/.test(p))
    .concat(trackedPaths.includes('php-api/.htaccess') ? ['php-api/.htaccess'] : [])
    .sort()
}

/** Numeric order: schema.sql, schema_modules.sql, then schema_phase2 .. N. */
export function schemaOrder(names) {
  const rank = (n) => {
    if (n === 'schema.sql') return -2
    if (n === 'schema_modules.sql') return -1
    const m = n.match(/^schema_phase(\d+)\.sql$/)
    return m ? Number(m[1]) : 1e9
  }
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

/**
 * Build the manifest object. `read(path)` returns the file bytes; kept as a
 * parameter so the tests can run without touching the disk.
 */
export function buildManifest({ deployYaml, trackedPaths, read, commit, branch, dirty, generated }) {
  const ci = parseDeployList(deployYaml)
  if (ci.length === 0) throw new Error('deploy.yml lists no php-api files; refusing to write a manifest')
  const files = serverFiles(trackedPaths)
  const known = new Set(files.map((p) => basename(p)))
  const unknownCi = ci.filter((n) => !known.has(n))
  if (unknownCi.length) throw new Error('deploy.yml copies files that are not tracked in php-api/: ' + unknownCi.join(', '))
  const schemaNames = schemaOrder(
    trackedPaths.filter((p) => /^php-api\/schema(_modules|_phase\d+)?\.sql$/.test(p)).map((p) => basename(p)),
  )
  const unmapped = schemaNames.filter((n) => !(n in SCHEMA_MARKERS))
  if (unmapped.length) throw new Error('No marker for ' + unmapped.join(', ') + ': add one to SCHEMA_MARKERS')
  return {
    format: MANIFEST_FORMAT,
    generated,
    commit,
    branch,
    dirty,
    files: files.map((p) => ({
      name: basename(p),
      source: p,
      deploy: ci.includes(basename(p)) ? 'ci' : 'manual',
      sha256: sha256(read(p)),
    })),
    schemas: schemaNames.map((n) => ({
      name: n,
      sha256: sha256(read('php-api/' + n)),
      marker: SCHEMA_MARKERS[n],
    })),
  }
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim()
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  let out = resolve(root, 'release-manifest.json')
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) out = resolve(argv[++i])
    else if (argv[i] === '-h' || argv[i] === '--help') {
      console.log('Usage: node scripts/release/manifest.mjs [--out FILE]')
      return 0
    } else {
      console.error('Unknown option: ' + argv[i])
      return 2
    }
  }
  const deployPath = resolve(root, '.github/workflows/deploy.yml')
  if (!existsSync(deployPath)) { console.error('Missing ' + deployPath); return 1 }
  const trackedPaths = git(root, ['ls-files', '--', 'php-api']).split('\n').filter(Boolean)
  const dirty = git(root, ['status', '--porcelain', '--', 'php-api', '.github/workflows/deploy.yml']) !== ''
  const manifest = buildManifest({
    deployYaml: readFileSync(deployPath, 'utf8'),
    trackedPaths,
    read: (p) => readFileSync(resolve(root, p)),
    commit: git(root, ['rev-parse', 'HEAD']),
    branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty,
    generated: new Date().toISOString(),
  })
  writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n')
  const ci = manifest.files.filter((f) => f.deploy === 'ci').length
  console.log(`Wrote ${out}`)
  console.log(`  commit ${manifest.commit} (${manifest.branch})${dirty ? ', WITH UNCOMMITTED CHANGES in php-api/ or deploy.yml' : ''}`)
  console.log(`  ${manifest.files.length} server files: ${ci} ci, ${manifest.files.length - ci} manual; ${manifest.schemas.length} schema files`)
  if (dirty) console.log('  Warning: generate the manifest from a clean checkout of the deployed commit.')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)))
}
