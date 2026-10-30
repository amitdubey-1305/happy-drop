import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverLevelsPath = path.resolve(__dirname, '../../server/data/levels.json');
const clientLevelsPath = path.resolve(__dirname, '../src/dev/levels.json');

try {
  if (!fs.existsSync(serverLevelsPath)) {
    console.error(`[syncLevels] Source file not found: ${serverLevelsPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(serverLevelsPath, 'utf8');
  // Validate that it's valid JSON
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('levels.json must contain an array of level definitions');
  }

  const targetDir = path.dirname(clientLevelsPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(clientLevelsPath, JSON.stringify(parsed, null, 2), 'utf8');
  console.log(`[syncLevels] Successfully synced ${parsed.length} levels from server to client!`);
  console.log(`  Source: ${serverLevelsPath}`);
  console.log(`  Destination: ${clientLevelsPath}`);
} catch (err) {
  console.error('[syncLevels] Error syncing levels:', err.message);
  process.exit(1);
}
