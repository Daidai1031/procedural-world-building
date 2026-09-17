import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'

for (const filename of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  try {
    const values = parseEnv(await readFile(filename, 'utf8'))
    for (const [key, value] of Object.entries(values)) if (value) process.env[key] = value
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}
const liveKey = Boolean(process.env.ANTHROPIC_API_KEY)
if (!liveKey) process.env.ANTHROPIC_API_KEY = `sk-ant-test-${randomBytes(24).toString('hex')}`
const build = spawnSync('npm.cmd', ['run', 'build'], { encoding: 'utf8', shell: true, env: process.env })
await writeFile('artifacts/phase5/build-after.txt', build.stdout + build.stderr)
if (build.status !== 0) throw new Error('Production build failed; see build-after.txt')
const keys = ['ANTHROPIC_API_KEY', 'TUTOR_PASSPHRASE', 'SESSION_SECRET', 'UPSTASH_REDIS_REST_TOKEN'].map((key) => process.env[key]).filter(Boolean)
const valueScan = spawnSync('rg', ['--fixed-strings', '--files-with-matches', '-f', '-', 'dist'], { input: keys.join('\n'), encoding: 'utf8' })
const prefixScan = spawnSync('rg', ['--fixed-strings', '--files-with-matches', 'sk-ant', 'dist'], { encoding: 'utf8' })
const report = { keySource: liveKey ? 'Configured server key' : 'Ephemeral build canary; no real API key was configured', valueScan: { command: 'rg --fixed-strings --files-with-matches -f <in-memory secret patterns> dist', stdout: valueScan.stdout, exitCode: valueScan.status }, prefixScan: { command: 'rg --fixed-strings --files-with-matches sk-ant dist', stdout: prefixScan.stdout, exitCode: prefixScan.status } }
await writeFile('artifacts/phase5/secret-scan.json', JSON.stringify(report, null, 2) + '\n')
if (valueScan.status !== 1 || prefixScan.status !== 1) throw new Error('Secret scan found a match or could not complete')
console.log('Both dist scans returned no matches. ' + report.keySource)
