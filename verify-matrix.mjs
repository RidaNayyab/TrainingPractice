import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(__dirname, 'src/data/indicator-priority-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));

const tier1 = matrix.tiers.tier_1_structural.indicators;

console.log('Current Tier 1 Indicators:');
console.log(`SI1: priority=${tier1.SI1.priority}, rank=${tier1.SI1.priority_rank}`);
console.log(`SI2: priority=${tier1.SI2.priority}, rank=${tier1.SI2.priority_rank}`);
console.log(`SI3: priority=${tier1.SI3.priority}, rank=${tier1.SI3.priority_rank}`);
