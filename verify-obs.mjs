// Test the observations endpoint
const teacherId = '12711';
const response = await fetch(`http://localhost:3001/api/teacher/${teacherId}/observations`);
const data = await response.json();

console.log('Status:', response.status);
console.log('Data:', JSON.stringify(data, null, 2));
console.log('Count:', Array.isArray(data) ? data.length : 'not an array');
