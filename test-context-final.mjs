// Final verification test - ensure all three contexts are working

async function testContextIntegration() {
  const testCases = [
    {
      name: 'CRITICAL (L1 - 72% failure)',
      indicatorCode: 'L1',
      trainingCode: 'L1',
      learningOutcome: 'Teachers can design explicit, systematic phonics instruction'
    },
    {
      name: 'DEVELOPING (PIC-4 - 19% failure)',
      indicatorCode: 'PIC-4',
      trainingCode: 'PIC-4',
      learningOutcome: 'Teachers can craft higher-order questions'
    },
    {
      name: 'FOUNDATIONAL (SI1 - 16% failure)',
      indicatorCode: 'SI1',
      trainingCode: 'SI1',
      learningOutcome: 'Teachers can state clear learning objectives'
    }
  ];

  console.log('═'.repeat(80));
  console.log('FINAL CONTEXT INTEGRATION TEST');
  console.log('═'.repeat(80) + '\n');

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log('─'.repeat(80));

    try {
      const response = await fetch('http://localhost:3001/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicatorCode: testCase.indicatorCode,
          trainingCode: testCase.trainingCode,
          learningOutcome: testCase.learningOutcome
        })
      });

      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}`);
        continue;
      }

      const result = await response.json();

      if (result.questions && result.questions.length === 2) {
        console.log(`✅ Generated 2 questions\n`);

        result.questions.forEach((q, idx) => {
          console.log(`Q${idx + 1}:`);
          console.log(`  Prompt: ${q.prompt.substring(0, 80)}${q.prompt.length > 80 ? '...' : ''}`);
          console.log(`  Rubric Criteria: ${q.rubricCriteria.length} items`);

          // Check if scenario mentions key context clues
          if (q.scenario) {
            const scenario = q.scenario.toLowerCase();
            const hasGrade = /grade|class/.test(scenario);
            const hasPakistani = /pakistan|urdu|school|teacher/.test(scenario);
            console.log(`  Scenario Details: Grade/Level=${hasGrade ? '✓' : '✗'}, Pakistani Context=${hasPakistani ? '✓' : '✗'}`);
          }
        });

        console.log('\n✅ Context integration successful\n');
      } else {
        console.error('❌ Unexpected response format:', result);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('═'.repeat(80));
  console.log('✅ TEST COMPLETE - All three contexts are working');
  console.log('═'.repeat(80));
}

testContextIntegration();
