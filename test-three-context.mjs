// Test the three-context question generation pipeline
async function testQuestionGeneration() {
  const testCases = [
    {
      name: "CRITICAL indicator (L1 - 72% failure)",
      indicatorCode: "L1",
      trainingCode: "phonics-mastery-101",
      learningOutcome: "Teachers can design and implement explicit, systematic phonics instruction"
    },
    {
      name: "DEVELOPING indicator (PIC-4 - 19% failure)",
      indicatorCode: "PIC-4",
      trainingCode: "questioning-skills-102",
      learningOutcome: "Teachers can craft and ask higher-order, open-ended questions"
    },
    {
      name: "FOUNDATIONAL indicator (SI1 - 16% failure)",
      indicatorCode: "SI1",
      trainingCode: "instructional-clarity-101",
      learningOutcome: "Teachers can state clear learning objectives"
    }
  ];

  for (const testCase of testCases) {
    console.log('\n' + '='.repeat(80));
    console.log(`TEST: ${testCase.name}`);
    console.log('='.repeat(80));

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
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        continue;
      }

      const result = await response.json();

      // Check if questions were generated
      if (result.questions && Array.isArray(result.questions)) {
        console.log(`✅ Generated ${result.questions.length} questions\n`);

        result.questions.forEach((q, idx) => {
          console.log(`Q${idx + 1}: ${q.prompt.substring(0, 80)}...`);
          console.log(`     Rubric Criteria: ${q.rubricCriteria.length} items`);
          if (q.scenario) {
            console.log(`     Scenario: ${q.scenario.substring(0, 60)}...`);
          }
        });
      } else {
        console.error('❌ No questions in response:', result);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete');
  console.log('='.repeat(80));
}

testQuestionGeneration();
