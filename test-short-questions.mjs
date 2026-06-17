// Test short question format

async function testShortFormat() {
  try {
    console.log('Testing short question format...\n');

    const response = await fetch('http://localhost:3001/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        indicatorCode: 'SI1',
        trainingCode: 'SI1',
        learningOutcome: 'State clear learning objectives'
      })
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status}`);
      return;
    }

    const result = await response.json();

    if (result.questions && result.questions.length === 2) {
      console.log('✅ Generated 2 questions\n');

      result.questions.forEach((q, idx) => {
        console.log(`Q${idx + 1}:`);
        console.log(`  Scenario: ${q.scenario}`);
        console.log(`  Prompt: ${q.prompt}`);
        console.log(`  Criteria: ${q.rubricCriteria.length} items`);
        console.log();
      });

      // Check length
      const totalLength = JSON.stringify(result.questions).length;
      const avgLength = totalLength / 2;
      console.log(`📊 Average question length: ${Math.round(avgLength)} characters`);
      console.log(`   (Original was ~800-1000 chars per question)`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

sleep(2000).then(() => testShortFormat());

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
