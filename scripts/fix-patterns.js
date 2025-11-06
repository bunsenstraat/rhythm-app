#!/usr/bin/env node

/**
 * Script to validate and auto-correct all pattern files
 * Fixes bar length issues, incomplete bars, and overflow problems
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const patternsDir = path.join(__dirname, '..', 'public', 'patterns');

// Beat values for each duration
const BEAT_VALUES = {
  'w': 4,
  'h': 2,
  'q': 1,
  '8': 0.5,
  '16': 0.25,
  'q3': 2/3,
  '83': 1/3
};

function getNoteBeats(note) {
  let beats = BEAT_VALUES[note.duration];
  if (note.dotted) {
    beats *= 1.5;
  }
  return beats;
}

function analyzeBars(pattern) {
  const barsAnalysis = [];
  const expectedBeatsPerBar = pattern.beatsPerBar;
  
  let currentBarBeats = 0;
  let currentBarNotes = [];
  let barNumber = 1;

  for (const note of pattern.notes) {
    const noteBeats = getNoteBeats(note);
    
    // Check if adding this note would exceed the bar
    if (currentBarBeats + noteBeats > expectedBeatsPerBar + 0.001) {
      // Save current bar analysis
      barsAnalysis.push({
        barNumber,
        expectedBeats: expectedBeatsPerBar,
        actualBeats: currentBarBeats,
        deficit: currentBarBeats - expectedBeatsPerBar,
        notes: [...currentBarNotes]
      });
      
      // Start new bar
      barNumber++;
      currentBarBeats = noteBeats;
      currentBarNotes = [note];
    } else {
      currentBarBeats += noteBeats;
      currentBarNotes.push(note);
      
      // Check if bar is complete
      if (Math.abs(currentBarBeats - expectedBeatsPerBar) < 0.001) {
        barsAnalysis.push({
          barNumber,
          expectedBeats: expectedBeatsPerBar,
          actualBeats: currentBarBeats,
          deficit: 0,
          notes: [...currentBarNotes]
        });
        
        barNumber++;
        currentBarBeats = 0;
        currentBarNotes = [];
      }
    }
  }

  // Handle last incomplete bar
  if (currentBarNotes.length > 0) {
    barsAnalysis.push({
      barNumber,
      expectedBeats: expectedBeatsPerBar,
      actualBeats: currentBarBeats,
      deficit: currentBarBeats - expectedBeatsPerBar,
      notes: currentBarNotes
    });
  }

  return barsAnalysis;
}

function createRestsFilling(beats) {
  const rests = [];
  let remaining = beats;

  const durations = [
    { duration: 'w', beats: 4 },
    { duration: 'h', beats: 2 },
    { duration: 'q', beats: 1 },
    { duration: '8', beats: 0.5 },
    { duration: '16', beats: 0.25 }
  ];

  for (const { duration, beats } of durations) {
    while (remaining >= beats - 0.001) {
      rests.push({ duration, type: 'rest' });
      remaining -= beats;
    }
  }

  return rests;
}

function autoFillRests(pattern) {
  const correctedNotes = [];
  const barsAnalysis = analyzeBars(pattern);
  
  barsAnalysis.forEach(bar => {
    // Add all notes from this bar
    correctedNotes.push(...bar.notes);
    
    // If bar is incomplete, fill with rests
    if (bar.deficit < -0.001) {
      const remainingBeats = bar.expectedBeats - bar.actualBeats;
      const fillRests = createRestsFilling(remainingBeats);
      correctedNotes.push(...fillRests);
    }
  });

  return {
    ...pattern,
    notes: correctedNotes,
    bars: barsAnalysis.length
  };
}

function validatePattern(pattern) {
  const errors = [];
  const warnings = [];

  if (pattern.notes.length === 0) {
    errors.push('Pattern has no notes');
    return { isValid: false, errors, warnings };
  }

  const barsAnalysis = analyzeBars(pattern);
  
  barsAnalysis.forEach(bar => {
    if (bar.deficit > 0.001) {
      errors.push(
        `Bar ${bar.barNumber} overfilled: ${bar.actualBeats.toFixed(2)}/${bar.expectedBeats} beats`
      );
    } else if (bar.deficit < -0.001) {
      warnings.push(
        `Bar ${bar.barNumber} incomplete: ${bar.actualBeats.toFixed(2)}/${bar.expectedBeats} beats`
      );
    }
  });

  const actualBars = barsAnalysis.length;
  if (actualBars !== pattern.bars) {
    warnings.push(
      `Actual bars (${actualBars}) != metadata bars (${pattern.bars})`
    );
  }

  return { 
    isValid: errors.length === 0, 
    errors, 
    warnings,
    barsAnalysis 
  };
}

// Main script
try {
  const files = fs.readdirSync(patternsDir);
  const patternFiles = files.filter(file => 
    file.endsWith('.json') && file !== 'index.json'
  );

  console.log(`\n🔍 Validating ${patternFiles.length} pattern files...\n`);

  let fixedCount = 0;
  let validCount = 0;
  let errorCount = 0;

  const results = [];

  patternFiles.forEach(filename => {
    const filePath = path.join(patternsDir, filename);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const validation = validatePattern(content.pattern);
    
    const result = {
      filename,
      name: content.name,
      ...validation
    };

    results.push(result);

    if (validation.isValid && validation.warnings.length === 0) {
      validCount++;
      console.log(`✅ ${filename}: Valid`);
    } else if (validation.errors.length > 0) {
      errorCount++;
      console.log(`❌ ${filename}: ${content.name}`);
      validation.errors.forEach(err => console.log(`   - ${err}`));
      
      // Auto-fix
      console.log(`   🔧 Auto-fixing...`);
      const corrected = autoFillRests(content.pattern);
      const revalidation = validatePattern(corrected);
      
      if (revalidation.isValid) {
        content.pattern = corrected;
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
        fixedCount++;
        console.log(`   ✓ Fixed and saved!`);
      } else {
        console.log(`   ✗ Could not auto-fix`);
      }
    } else if (validation.warnings.length > 0) {
      console.log(`⚠️  ${filename}: ${content.name}`);
      validation.warnings.forEach(warn => console.log(`   - ${warn}`));
      
      // Auto-fix warnings
      const corrected = autoFillRests(content.pattern);
      content.pattern = corrected;
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
      fixedCount++;
      console.log(`   ✓ Fixed and saved!`);
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary:`);
  console.log(`   ✅ Valid patterns: ${validCount}`);
  console.log(`   🔧 Fixed patterns: ${fixedCount}`);
  console.log(`   ❌ Unfixable errors: ${errorCount - fixedCount}`);
  console.log(`${'='.repeat(60)}\n`);

  if (fixedCount > 0) {
    console.log(`💾 ${fixedCount} pattern(s) were auto-corrected and saved!\n`);
  }

} catch (error) {
  console.error('❌ Error fixing patterns:', error.message);
  process.exit(1);
}
