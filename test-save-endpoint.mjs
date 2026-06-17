#!/usr/bin/env node

console.log('🧪 Testing /api/save-questions endpoint\n');

const testQuestion = {
  scenario: "You are teaching Grade 5 Math. You write 'Topic: Fractions' on the board and say 'We will learn fractions today.' Student asks 'What exactly will we learn?' What would you do?",
  prompt: "What would you say to make your learning objective clearer?",
  rubricCriteria: ["Specific action verb used", "Clear measurable outcome", "Student-friendly language"]
};

try {
  const response = await fetch('http://localhost:3001/api/save-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trainingCode: 'TEST_ENDPOINT',
      indicatorCode: 'SI1',
      questions: [testQuestion, testQuestion]
    })
  });

  console.log('Response Status:', response.status);
  console.log('Response OK:', response.ok);

  const data = await response.json();
  console.log('Response Data:', data);

  if (data.success) {
    console.log('\n✅ Save endpoint returned SUCCESS');
    console.log(`   Saved ${data.count} questions`);

    // Now query the database to verify
    console.log('\n🔍 Checking database for saved questions...\n');

    const checkResponse = await fetch('http://localhost:3001/api/generated-questions?trainingCode=TEST_ENDPOINT');
    if (checkResponse.ok) {
      const questions = await checkResponse.json();
      console.log(`Found ${questions.length} questions in DB for TEST_ENDPOINT`);
      if (questions.length > 0) {
        console.log('✅ Data IS in database');
      } else {
        console.log('❌ Data NOT in database (save endpoint lied!)');
      }
    }
  } else {
    console.log('\n❌ Save endpoint returned ERROR');
    console.log('   Error:', data.error);
  }

} catch (error) {
  console.error('❌ Request failed:', error.message);
}
