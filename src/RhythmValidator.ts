// Rhythm validation and auto-correction system

import type { RhythmPattern, Note, NoteDuration } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedPattern?: RhythmPattern;
}

export interface BarAnalysis {
  barNumber: number;
  expectedBeats: number;
  actualBeats: number;
  deficit: number; // negative if too few beats, positive if too many
  notes: Note[];
}

export class RhythmValidator {
  // Beat values for each duration
  private static readonly BEAT_VALUES: Record<NoteDuration, number> = {
    'w': 4,
    'h': 2,
    'h.': 3,
    'q': 1,
    'q.': 1.5,
    '8': 0.5,
    '16': 0.25,
    'q3': 2/3,
    '83': 1/3
  };

  /**
   * Get the beat value for a note, including dotted modifications
   */
  static getNoteBeats(note: Note): number {
    let beats = this.BEAT_VALUES[note.duration];
    if (note.dotted) {
      beats *= 1.5;
    }
    return beats;
  }

  /**
   * Analyze each bar in the pattern
   */
  static analyzeBars(pattern: RhythmPattern): BarAnalysis[] {
    const barsAnalysis: BarAnalysis[] = [];
    const expectedBeatsPerBar = pattern.beatsPerBar;
    
    let currentBarBeats = 0;
    let currentBarNotes: Note[] = [];
    let barNumber = 1;

    for (const note of pattern.notes) {
      const noteBeats = this.getNoteBeats(note);
      
      // Check if adding this note would exceed the bar
      if (currentBarBeats + noteBeats > expectedBeatsPerBar + 0.001) { // small epsilon for floating point
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

  /**
   * Validate a pattern and return detailed results
   */
  static validate(pattern: RhythmPattern): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (pattern.notes.length === 0) {
      errors.push('Pattern has no notes');
      return { isValid: false, errors, warnings };
    }

    const barsAnalysis = this.analyzeBars(pattern);
    
    // Check each bar for issues
    barsAnalysis.forEach(bar => {
      if (bar.deficit > 0.001) {
        errors.push(
          `Bar ${bar.barNumber} is overfilled: ${bar.actualBeats.toFixed(2)} beats (expected ${bar.expectedBeats})`
        );
      } else if (bar.deficit < -0.001) {
        warnings.push(
          `Bar ${bar.barNumber} is incomplete: ${bar.actualBeats.toFixed(2)} beats (expected ${bar.expectedBeats})`
        );
      }
    });

    // Check if total bars match expected
    const actualBars = barsAnalysis.length;
    if (actualBars !== pattern.bars) {
      warnings.push(
        `Pattern has ${actualBars} bar(s) but metadata says ${pattern.bars} bar(s)`
      );
    }

    const isValid = errors.length === 0;
    return { isValid, errors, warnings };
  }

  /**
   * Auto-correct a pattern by filling incomplete bars with rests
   */
  static autoFillRests(pattern: RhythmPattern): RhythmPattern {
    const correctedNotes: Note[] = [];
    const barsAnalysis = this.analyzeBars(pattern);
    
    barsAnalysis.forEach(bar => {
      // Add all notes from this bar
      correctedNotes.push(...bar.notes);
      
      // If bar is incomplete and not the last bar, fill with rests
      if (bar.deficit < -0.001) {
        const remainingBeats = bar.expectedBeats - bar.actualBeats;
        const fillRests = this.createRestsFilling(remainingBeats);
        correctedNotes.push(...fillRests);
      }
    });

    return {
      ...pattern,
      notes: correctedNotes,
      bars: barsAnalysis.length
    };
  }

  /**
   * Auto-correct by trimming notes that overflow bars
   */
  static trimOverflow(pattern: RhythmPattern): RhythmPattern {
    const correctedNotes: Note[] = [];
    let currentBarBeats = 0;
    const beatsPerBar = pattern.beatsPerBar;

    for (const note of pattern.notes) {
      const noteBeats = this.getNoteBeats(note);
      
      // If note fits in current bar, add it
      if (currentBarBeats + noteBeats <= beatsPerBar + 0.001) {
        correctedNotes.push(note);
        currentBarBeats += noteBeats;
        
        // Reset if bar is complete
        if (Math.abs(currentBarBeats - beatsPerBar) < 0.001) {
          currentBarBeats = 0;
        }
      } else {
        // Note would overflow - split it with a tie
        const remainingBeats = beatsPerBar - currentBarBeats;
        
        if (remainingBeats > 0.001) {
          // Add tied note for the remainder of this bar
          const fillDuration = this.findClosestDuration(remainingBeats);
          if (fillDuration) {
            correctedNotes.push({
              duration: fillDuration,
              type: note.type,
              tie: true
            });
          }
        }
        
        // Start new bar with continuation
        currentBarBeats = noteBeats - remainingBeats;
        if (currentBarBeats > 0.001) {
          const continueDuration = this.findClosestDuration(currentBarBeats);
          if (continueDuration) {
            correctedNotes.push({
              duration: continueDuration,
              type: note.type
            });
          }
        }
        
        if (Math.abs(currentBarBeats - beatsPerBar) < 0.001) {
          currentBarBeats = 0;
        }
      }
    }

    return {
      ...pattern,
      notes: correctedNotes
    };
  }

  /**
   * Smart auto-correct that decides the best strategy
   */
  static autoCorrect(pattern: RhythmPattern): ValidationResult {
    const validation = this.validate(pattern);
    
    if (validation.isValid && validation.warnings.length === 0) {
      return validation;
    }

    // If there are overflow errors, try trimming
    const hasOverflow = validation.errors.some(e => e.includes('overfilled'));
    const hasUnderflow = validation.warnings.some(w => w.includes('incomplete'));

    let correctedPattern: RhythmPattern;

    if (hasOverflow) {
      correctedPattern = this.trimOverflow(pattern);
    } else if (hasUnderflow) {
      correctedPattern = this.autoFillRests(pattern);
    } else {
      correctedPattern = pattern;
    }

    // Validate the corrected pattern
    const correctedValidation = this.validate(correctedPattern);
    
    return {
      ...correctedValidation,
      correctedPattern
    };
  }

  /**
   * Create rests to fill a specific number of beats
   */
  private static createRestsFilling(beats: number): Note[] {
    const rests: Note[] = [];
    let remaining = beats;

    // Use largest possible rest values
    const durations: { duration: NoteDuration; beats: number }[] = [
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

  /**
   * Find the closest duration for a given number of beats
   */
  private static findClosestDuration(beats: number): NoteDuration | null {
    const durations: { duration: NoteDuration; beats: number }[] = [
      { duration: 'w', beats: 4 },
      { duration: 'h', beats: 2 },
      { duration: 'q', beats: 1 },
      { duration: '8', beats: 0.5 },
      { duration: '16', beats: 0.25 }
    ];

    // Find exact match first
    for (const { duration, beats: durBeats } of durations) {
      if (Math.abs(beats - durBeats) < 0.001) {
        return duration;
      }
    }

    // Find closest smaller duration
    for (const { duration, beats: durBeats } of durations) {
      if (durBeats <= beats + 0.001) {
        return duration;
      }
    }

    return '16'; // fallback to sixteenth note
  }

  /**
   * Get a human-readable summary of bar issues
   */
  static getBarSummary(pattern: RhythmPattern): string {
    const barsAnalysis = this.analyzeBars(pattern);
    const lines: string[] = [];

    lines.push(`Pattern Analysis (${pattern.beatsPerBar}/4 time):`);
    lines.push('');

    barsAnalysis.forEach(bar => {
      const status = Math.abs(bar.deficit) < 0.001 
        ? '✓' 
        : bar.deficit > 0 
          ? '⚠️ OVERFLOW' 
          : '⚠️ INCOMPLETE';
      
      lines.push(
        `Bar ${bar.barNumber}: ${bar.actualBeats.toFixed(2)}/${bar.expectedBeats} beats ${status}`
      );
    });

    return lines.join('\n');
  }

  /**
   * Calculate total beats in pattern
   */
  static getTotalBeats(pattern: RhythmPattern): number {
    return pattern.notes.reduce((total, note) => {
      return total + this.getNoteBeats(note);
    }, 0);
  }

  /**
   * Calculate expected total beats based on bars and time signature
   */
  static getExpectedBeats(pattern: RhythmPattern): number {
    return pattern.bars * pattern.beatsPerBar;
  }
}
