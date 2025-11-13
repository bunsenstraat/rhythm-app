// Quick test with Node.js to see what abcjs returns for triplets
// Run with: node test-abc-triplet.js

const abc = `X:1
T:Test
M:4/4
L:1/4
K:C
(3zCC (3CCC | C C C C |`;

console.log('Testing ABC triplet parsing...\n');
console.log('ABC Input:');
console.log(abc);
console.log('\n' + '='.repeat(60) + '\n');

// Simulate what we expect:
// (3zCC means 3 notes in the time of 2
// With L:1/4 (quarter note default), this is 3 quarters in time of 2 quarters
// So each note is 2/3 of a quarter
// As fraction of whole note: (2/3) * 0.25 = 0.1667

console.log('Expected durations for quarter triplets:');
console.log('  Each note: 2/3 of a quarter note');
console.log('  As fraction of whole: 0.25 * (2/3) ≈ 0.1667');
console.log('  Or could be: 0.25 / 1.5 ≈ 0.1667');
console.log('\nNeed to check what abcjs actually returns...');
