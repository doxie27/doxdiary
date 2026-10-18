/**
 * Baut ein Release-Paket für STRATO unter release/:
 *   release/doxie-public/   → Webroot (Domain zeigt hierher)
 *   release/doxie-private/  → außerhalb des Webroots (App-Code, Migrationen)
 * Aufruf: npm run release   (läuft unter Windows, macOS und Linux)
 * config.php und storage/ werden bewusst NICHT mitgeliefert.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const out = join(root, 'release')
const pub = join(out, 'doxie-public')
const priv = join(out, 'doxie-private', 'app')

execSync('npm run build', { stdio: 'inherit' })
rmSync(out, { recursive: true, force: true })
mkdirSync(join(pub, 'api'), { recursive: true })
mkdirSync(priv, { recursive: true })

cpSync(join(root, 'dist'), pub, { recursive: true })
cpSync(join(root, 'deploy', 'htaccess-webroot'), join(pub, '.htaccess'))
cpSync(join(root, 'api', 'public', 'index.php'), join(pub, 'api', 'index.php'))
cpSync(join(root, 'api', 'public', '.htaccess'), join(pub, 'api', '.htaccess'))
for (const dir of ['src', 'bin', 'migrations']) cpSync(join(root, 'api', dir), join(priv, dir), { recursive: true })
cpSync(join(root, 'api', 'config.example.php'), join(out, 'doxie-private', 'config.example.php'))
// Schutz, falls doxie-private versehentlich im Webroot landet
writeFileSync(join(out, 'doxie-private', '.htaccess'), 'Require all denied\n')

if (!existsSync(join(pub, 'index.html'))) throw new Error('Build fehlt')
console.log('\n✔ Release unter release/ erstellt – siehe docs/05-deployment.md')
