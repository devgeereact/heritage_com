import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { Buffer } from 'node:buffer'
import {
  parseDeployList,
  serverFiles,
  schemaOrder,
  buildManifest,
  sha256,
  SCHEMA_MARKERS,
} from '../../scripts/release/manifest.mjs'

// Vitest runs from the repository root (vite.config.js).
const root = cwd()

describe('release manifest (A02)', () => {
  it('reads the cp lines of deploy.yml and ignores comments', () => {
    const yaml = [
      '        run: |',
      '          cp php-api/_lib.php       dist/',
      '          # cp php-api/old.php dist/',
      '          cp php-api/api.php dist/   # trailing comment',
      '          cp php-api/_lib.php dist/',
      '          cp README.md dist/',
    ].join('\n')
    expect(parseDeployList(yaml)).toEqual(['_lib.php', 'api.php'])
  })

  it('finds every file the real deploy.yml copies, all of them tracked', () => {
    const list = parseDeployList(readFileSync(resolve(root, '.github/workflows/deploy.yml'), 'utf8'))
    expect(list).toContain('_lib.php')
    expect(list).toContain('company_jobs.php')
    expect(list).not.toContain('users.php')
    expect(list).not.toContain('config.php')
  })

  it('keeps config files, tests and subfolders out of the server list', () => {
    const files = serverFiles([
      'php-api/users.php',
      'php-api/config.sample.php',
      'php-api/tests/run.php',
      'php-api/schema.sql',
      'php-api/.htaccess',
      'php-api/_lib.php',
      'src/x.php',
    ])
    expect(files).toEqual(['php-api/.htaccess', 'php-api/_lib.php', 'php-api/users.php'])
  })

  it('orders schema files numerically', () => {
    expect(schemaOrder(['schema_phase10.sql', 'schema_phase2.sql', 'schema_modules.sql', 'schema.sql'])).toEqual([
      'schema.sql',
      'schema_modules.sql',
      'schema_phase2.sql',
      'schema_phase10.sql',
    ])
  })

  it('marks ci and manual files and hashes the bytes', () => {
    const bytes = { 'php-api/_lib.php': 'lib', 'php-api/users.php': 'users', 'php-api/schema.sql': 'sql' }
    const m = buildManifest({
      deployYaml: 'cp php-api/_lib.php dist/',
      trackedPaths: Object.keys(bytes),
      read: (p) => Buffer.from(bytes[p]),
      commit: 'a'.repeat(40),
      branch: 'main',
      dirty: false,
      generated: '2026-10-18T00:00:00.000Z',
    })
    expect(m.format).toBe(1)
    expect(m.files).toEqual([
      { name: '_lib.php', source: 'php-api/_lib.php', deploy: 'ci', sha256: sha256(Buffer.from('lib')) },
      { name: 'users.php', source: 'php-api/users.php', deploy: 'manual', sha256: sha256(Buffer.from('users')) },
    ])
    expect(m.schemas).toEqual([{ name: 'schema.sql', sha256: sha256(Buffer.from('sql')), marker: { table: 'users' } }])
  })

  it('refuses a deploy list naming a file that is not tracked', () => {
    expect(() =>
      buildManifest({
        deployYaml: 'cp php-api/gone.php dist/',
        trackedPaths: ['php-api/_lib.php'],
        read: () => Buffer.from(''),
      }),
    ).toThrow(/gone\.php/)
  })

  it('refuses an empty deploy list', () => {
    expect(() => buildManifest({ deployYaml: '', trackedPaths: ['php-api/_lib.php'], read: () => Buffer.from('') })).toThrow(
      /no php-api files/,
    )
  })

  it('refuses a schema file without a marker', () => {
    expect(() =>
      buildManifest({
        deployYaml: 'cp php-api/_lib.php dist/',
        trackedPaths: ['php-api/_lib.php', 'php-api/schema_phase99.sql'],
        read: () => Buffer.from(''),
      }),
    ).toThrow(/schema_phase99\.sql/)
  })

  it('has a marker for every schema_phase file in php-api', () => {
    const phases = readdirSync(resolve(root, 'php-api')).filter((n) => /^schema_phase\d+\.sql$/.test(n))
    expect(phases.length).toBeGreaterThan(20)
    for (const n of phases) expect(SCHEMA_MARKERS[n], n).toBeTruthy()
  })
})
