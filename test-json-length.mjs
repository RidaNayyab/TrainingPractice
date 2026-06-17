// Test to check actual JSON lengths

async function test() {
  try {
    const response = await fetch('http://localhost:3001/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        indicatorCode: 'SI1',
        trainingCode: 'SI1',
        learningOutcome: 'State clear learning objectives'
      })
    });

    const result = await response.json();

    if (result.questions) {
      console.log('RAW JSON:');
      console.log(JSON.stringify(result.questions, null, 2));
      console.log('\nACTUAL LENGTHS:');
      result.questions.forEach((q, i) => {
        console.log(`\nQ${i + 1}:`);
        console.log(`  Scenario: ${q.scenario.length} chars`);
        console.log(`  Prompt: ${q.prompt.length} chars`);
        console.log(`  Criteria count: ${q.rubricCriteria.length}`);
        console.log(`  Scenario text: "${q.scenario}"`);
        console.log(`  Prompt text: "${q.prompt}"`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
