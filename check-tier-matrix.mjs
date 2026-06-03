import fs from 'fs';
import path from 'path';

const matrixPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'src/data/indicator-priority-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));

console.log('Indicators defined in tier system:\n');

Object.entries(matrix.tiers).forEach(([tierKey, tier]) => {
  console.log(`${tier.name} (${tierKey}):`);
  Object.keys(tier.indicators).forEach(code => {
    console.log(`  - ${code}`);
  });
  console.log('');
});
