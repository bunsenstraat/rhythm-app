// Quick test to see ABC notation output for beaming

const pattern = {
  bars: 1,
  beatsPerBar: 4,
  notes: [
    { duration: '8', type: 'note' },
    { duration: '8', type: 'note' },
    { duration: '8', type: 'note' },
    { duration: '8', type: 'note' },
    { duration: '8', type: 'note' },
    { duration: '8', type: 'note' },
    { duration: '8', type: 'note' },
    { duration: '8', type: 'note' }
  ]
};

// Simulate the conversion logic
const beatValues = {
  'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, 'q3': 2/3, '83': 1/3
};

function getNoteString(note) {
  const pitch = note.type === 'rest' ? 'z' : 'B';
  const durationMap = {
    'w': '4', 'h': '2', 'q': '', '8': '/', '16': '//', 'q3': '', '83': '/'
  };
  return pitch + durationMap[note.duration];
}

function shouldBreakBeam(duration, currentBeatInBar) {
  if (duration !== '8' && duration !== '16') {
    return false;
  }
  
  const beatBoundary = Math.round(currentBeatInBar);
  const isOnBeatBoundary = Math.abs(currentBeatInBar - beatBoundary) < 0.01 && beatBoundary > 0;
  
  return isOnBeatBoundary;
}

let abcNotes = '';
let currentBarBeats = 0;
let currentBeatInBar = 0;

for (let i = 0; i < pattern.notes.length; i++) {
  const note = pattern.notes[i];
  let noteBeats = beatValues[note.duration];
  
  const shouldBreak = shouldBreakBeam(note.duration, currentBeatInBar);
  
  if (shouldBreak && abcNotes.length > 0 && !abcNotes.endsWith(' ') && !abcNotes.endsWith('|')) {
    abcNotes += ' ';
  }
  
  const noteStr = getNoteString(note);
  abcNotes += noteStr;
  
  currentBarBeats += noteBeats;
  currentBeatInBar += noteBeats;
  
  console.log(`Note ${i}: duration=${note.duration}, currentBeatInBar=${currentBeatInBar}, shouldBreak=${shouldBreak}, abcNotes="${abcNotes}"`);
}

abcNotes += ' |';

console.log('\n=== Final ABC Notation ===');
console.log(abcNotes);
console.log('\nExpected: B/B/ B/B/ B/B/ B/B/ |');
console.log('(Two eighth notes beamed together, space at each beat boundary)');
