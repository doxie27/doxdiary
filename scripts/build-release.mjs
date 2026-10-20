/**
 * Baut ein Release-Paket für STRATO unter release/:
 *   release/<ordner>/       → öffentlich, z. B. Webroot/doxiediary/
 *   release/doxie-private/  → außerhalb des Webroots (App-Code, Migrationen)
 * Aufruf: npm run release  (Pfad über --base=/doxiediary/, Domain über --host=www.doxiediary.de, siehe package.json)
 * config.php und storage/ werden bewusst NICHT mitgeliefert.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const arg = process.argv.find((a) => a.startsWith('--base='))
const base = ('/' + (arg ? arg.slice(7) : '/').replace(/^\/+|\/+$/g, '') + '/').replace('//', '/')
const hostArg = process.argv.find((a) => a.startsWith('--host='))?.slice(7) ?? ''
if (hostArg && !/^[a-z0-9.-]+$/i.test(hostArg)) throw new Error(`Ungültige Domain: ${hostArg}`)
const folder = base === '/' ? 'doxie-public' : base.split('/').filter(Boolean).at(-1)
const out = join(root, 'release')
const pub = join(out, folder)
const priv = join(out, 'doxie-private', 'app')

execSync(`npx tsc -b && npx vite build --base=${base}`, { stdio: 'inherit' })
rmSync(out, { recursive: true, force: true })
mkdirSync(join(pub, 'api'), { recursive: true })
mkdirSync(priv, { recursive: true })

cpSync(join(root, 'dist'), pub, { recursive: true })
const htaccess = readFileSync(join(root, 'deploy', 'htaccess-webroot'), 'utf8')
  .replace('RewriteBase /', `RewriteBase ${base}`)
  .replace(/^#HOST (.*)$/gm, (_, rule) => (hostArg ? rule.replaceAll('__HOST__', hostArg) : ''))
writeFileSync(join(pub, '.htaccess'), htaccess)
cpSync(join(root, 'api', 'public', 'index.php'), join(pub, 'api', 'index.php'))
cpSync(join(root, 'api', 'public', '.htaccess'), join(pub, 'api', '.htaccess'))
for (const dir of ['src', 'bin', 'migrations']) cpSync(join(root, 'api', dir), join(priv, dir), { recursive: true })
cpSync(join(root, 'api', 'config.example.php'), join(out, 'doxie-private', 'config.example.php'))
// Schutz, falls doxie-private versehentlich im Webroot landet
writeFileSync(join(out, 'doxie-private', '.htaccess'), 'Require all denied\n')

if (!existsSync(join(pub, 'index.html'))) throw new Error('Build fehlt')
console.log(`\n✔ Release für ${hostArg ? 'https://' + hostArg : ''}${base} unter release/ erstellt (${folder}/ + doxie-private/) – siehe docs/05-deployment.md`)
