import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load priority matrix
const matrixPath = path.join(__dirname, 'src/data/indicator-priority-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));

console.log('Testing tier system logic:\n');

// Test getUnlockedTiers function
function getUnlockedTiers(teacherTier) {
  const tiers = [];
  if (teacherTier === 'structural' || teacherTier === 'core' || teacherTier === 'advanced' || teacherTier === 'subject-specific') {
    tiers.push('tier_1_structural');
  }
  if (teacherTier === 'core' || teacherTier === 'advanced' || teacherTier === 'subject-specific') {
    tiers.push('tier_2_core');
  }
  if (teacherTier === 'advanced' || teacherTier === 'subject-specific') {
    tiers.push('tier_3_advanced');
  }
  if (teacherTier === 'subject-specific') {
    tiers.push('tier_4_subject-specific');
  }

  return tiers;
}

// Test getUnlockedIndicators function
function getUnlockedIndicators(tiersList) {
  const indicators = new Set();
  tiersList.forEach(tierKey => {
    const tier = matrix.tiers[tierKey];
    if (tier && tier.indicators) {
      Object.keys(tier.indicators).forEach(code => indicators.add(code));
    }
  });
  return indicators;
}

// Test for teacher 1685 with advanced tier
const tier1685 = 'advanced';
const unlockedTiers1685 = getUnlockedTiers(tier1685);
const unlockedIndicators1685 = getUnlockedIndicators(unlockedTiers1685);

console.log(`Teacher 1685 (tier: ${tier1685}):`);
console.log(`  Unlocked tiers: ${unlockedTiers1685.join(', ')}`);
console.log(`  Unlocked indicators: ${Array.from(unlockedIndicators1685).sort().join(', ')}`);
console.log(`  Total: ${unlockedIndicators1685.size} indicators`);

// Check if PIA-3, PIA-4, PIA-5, MA-0 are in unlocked indicators
const testIndicators = ['PIA-3', 'PIA-4', 'PIA-5', 'MA-0', 'L1', 'L2', 'L3'];
console.log(`\nIndicator presence check:`);
testIndicators.forEach(ind => {
  const included = unlockedIndicators1685.has(ind);
  console.log(`  ${ind}: ${included ? '✓ INCLUDED' : '✗ NOT INCLUDED'}`);
});
