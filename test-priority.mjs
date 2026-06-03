import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(__dirname, 'src/data/indicator-priority-matrix.json');
const priorityMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));

function getPriorityRank(indicatorCode) {
  const tiers = priorityMatrix.tiers;
  for (const tier of Object.values(tiers)) {
    if (tier && tier.indicators && tier.indicators[indicatorCode]) {
      const rank = tier.indicators[indicatorCode].priority_rank || 99;
      console.log(`getPriorityRank(${indicatorCode}) = ${rank}`);
      return rank;
    }
  }
  return 99;
}

console.log('Testing getPriorityRank:');
getPriorityRank('SI1');
getPriorityRank('SI2');
getPriorityRank('SI3');
