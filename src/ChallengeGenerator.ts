// Challenge pattern generator

import type { RhythmPattern, NoteDuration, NoteType } from './types';

export interface Challenge {
  pattern: RhythmPattern;
  difficulty: 'easy' | 'eighth-basic' | 'eighth-syncopation' | 'eighth-rests' | 'eighth-cross-bar' | 'medium' | 'hard' | 'expert';
  title: string;
  description: string;
}

export class ChallengeGenerator {
  /**
   * Bundle consecutive rests into larger rest values
   */
  private static bundleConsecutiveRests(notes: Array<{ duration: NoteDuration; type: NoteType; tie?: boolean }>): Array<{ duration: NoteDuration; type: NoteType; tie?: boolean }> {
    const beatValues: Record<NoteDuration, number> = {
      'w': 4, 'h': 2, 'h.': 3, 'q': 1, 'q.': 1.5, '8': 0.5, '16': 0.25, 'q3': 2/3, '83': 1/3
    };
    
    const bundled: Array<{ duration: NoteDuration; type: NoteType; tie?: boolean }> = [];
    let i = 0;
    
    while (i < notes.length) {
      const note = notes[i];
      
      // If not a rest, just add it
      if (note.type !== 'rest') {
        bundled.push(note);
        i++;
        continue;
      }
      
      // Count consecutive rests
      let totalBeats = 0;
      let restCount = 0;
      
      for (let j = i; j < notes.length && notes[j].type === 'rest'; j++) {
        totalBeats += beatValues[notes[j].duration] || 0;
        restCount++;
      }
      
      // Convert total beats to optimal rest durations
      let remainingBeats = totalBeats;
      
      // Whole rests (4 beats)
      while (remainingBeats >= 3.99) {
        bundled.push({ duration: 'w', type: 'rest' });
        remainingBeats -= 4;
      }
      
      // Half rests (2 beats)
      while (remainingBeats >= 1.99) {
        bundled.push({ duration: 'h', type: 'rest' });
        remainingBeats -= 2;
      }
      
      // Dotted quarter rest (1.5 beats)
      if (remainingBeats >= 1.49 && remainingBeats < 1.51) {
        bundled.push({ duration: 'q.', type: 'rest' });
        remainingBeats -= 1.5;
      }
      
      // Quarter rests (1 beat)
      while (remainingBeats >= 0.99) {
        bundled.push({ duration: 'q', type: 'rest' });
        remainingBeats -= 1;
      }
      
      // Eighth rests (0.5 beats)
      while (remainingBeats >= 0.49) {
        bundled.push({ duration: '8', type: 'rest' });
        remainingBeats -= 0.5;
      }
      
      // Sixteenth rests (0.25 beats)
      while (remainingBeats >= 0.24) {
        bundled.push({ duration: '16', type: 'rest' });
        remainingBeats -= 0.25;
      }
      
      i += restCount;
    }
    
    return bundled;
  }

  /**
   * Generate a random challenge pattern
   */
  static generateChallenge(difficulty: 'easy' | 'eighth-basic' | 'eighth-syncopation' | 'eighth-rests' | 'eighth-cross-bar' | 'medium' | 'hard' | 'expert'): Challenge {
    const bars = 8; // All challenges are 8 bars
    const beatsPerBar = 4;
    
    let pattern: RhythmPattern;
    let title: string;
    let description: string;
    
    switch (difficulty) {
      case 'easy':
        pattern = this.generateEasyPattern(bars, beatsPerBar);
        title = 'Easy Challenge';
        description = 'Quarter notes and half notes with simple rhythms';
        break;
      case 'eighth-basic':
        pattern = this.generateEighthBasicPattern(bars, beatsPerBar);
        title = 'Eighth Notes - Basic';
        description = 'Steady eighth notes with occasional quarters';
        break;
      case 'eighth-syncopation':
        pattern = this.generateEighthSyncopationPattern(bars, beatsPerBar);
        title = 'Eighth Notes - Syncopation';
        description = 'Off-beat eighth notes and syncopated rhythms';
        break;
      case 'eighth-rests':
        pattern = this.generateEighthRestsPattern(bars, beatsPerBar);
        title = 'Eighth Notes - With Rests';
        description = 'Eighth note syncopation with rests on strong beats';
        break;
      case 'eighth-cross-bar':
        pattern = this.generateEighthCrossBarPattern(bars, beatsPerBar);
        title = 'Eighth Notes - Cross-Bar Ties';
        description = 'Syncopation across barlines and longer rests';
        break;
      case 'medium':
        pattern = this.generateMediumPattern(bars, beatsPerBar);
        title = 'Medium Challenge';
        description = 'Eighth notes, syncopation, and rests';
        break;
      case 'hard':
        pattern = this.generateHardPattern(bars, beatsPerBar);
        title = 'Hard Challenge';
        description = 'Sixteenth notes, ties, and complex syncopation';
        break;
      case 'expert':
        pattern = this.generateExpertPattern(bars, beatsPerBar);
        title = 'Expert Challenge';
        description = 'Advanced rhythms with triplets and dotted notes';
        break;
    }
    
    return { pattern, difficulty, title, description };
  }
  
  private static generateEasyPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        let duration: NoteDuration;
        
        if (remainingBeats >= 2 && Math.random() > 0.5) {
          duration = 'h'; // Half note
          beatsInBar += 2;
        } else {
          duration = 'q'; // Quarter note
          beatsInBar += 1;
        }
        
        notes.push({
          duration,
          type: Math.random() > 0.85 ? 'rest' : 'note' // 15% chance of rest
        });
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
  
  private static generateEighthBasicPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        
        if (remainingBeats >= 1 && Math.random() > 0.7) {
          // Quarter note (30% chance)
          notes.push({ duration: 'q', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5) {
          // Eighth note (70% chance)
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 0.5;
        }
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
  
  private static generateEighthSyncopationPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType; tie?: boolean }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        const rand = Math.random();
        
        if (remainingBeats >= 0.5 && rand > 0.9) {
          // Eighth rest (10% chance) - creates syncopation
          notes.push({ duration: '8', type: 'rest' });
          beatsInBar += 0.5;
        } else if (remainingBeats >= 1 && rand > 0.75) {
          // Tied eighth notes (15% chance) - creates syncopation
          notes.push({ duration: '8', type: 'note', tie: true });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 1 && rand > 0.55) {
          // Quarter note (20% chance)
          notes.push({ duration: 'q', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5) {
          // Eighth note (55% chance)
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 0.5;
        }
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
  
  private static generateEighthRestsPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType; tie?: boolean }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        const rand = Math.random();
        
        if (remainingBeats >= 1 && rand > 0.85) {
          // Quarter rest (15% chance)
          notes.push({ duration: 'q', type: 'rest' });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5 && rand > 0.75) {
          // Eighth rest (10% chance)
          notes.push({ duration: '8', type: 'rest' });
          beatsInBar += 0.5;
        } else if (remainingBeats >= 1 && rand > 0.6) {
          // Tied eighth notes (15% chance) - syncopation with ties
          notes.push({ duration: '8', type: 'note', tie: true });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 1 && rand > 0.4) {
          // Quarter note (20% chance)
          notes.push({ duration: 'q', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5) {
          // Eighth note (40% chance)
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 0.5;
        }
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
  
  private static generateEighthCrossBarPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType; tie?: boolean }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      const isLastBar = bar === bars - 1;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        const rand = Math.random();
        const isEndOfBar = remainingBeats <= 0.5;
        
        if (remainingBeats >= 2 && rand > 0.9) {
          // Half rest (10% chance) - longer rest
          notes.push({ duration: 'h', type: 'rest' });
          beatsInBar += 2;
        } else if (remainingBeats >= 1 && rand > 0.8) {
          // Quarter rest (10% chance)
          notes.push({ duration: 'q', type: 'rest' });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5 && rand > 0.7) {
          // Eighth rest (10% chance)
          notes.push({ duration: '8', type: 'rest' });
          beatsInBar += 0.5;
        } else if (!isLastBar && isEndOfBar && rand > 0.5) {
          // Tie across barline (20% chance when at end of bar) - THE HARD PART!
          notes.push({ duration: '8', type: 'note', tie: true });
          beatsInBar += 0.5;
        } else if (remainingBeats >= 1 && rand > 0.6) {
          // Tied eighth notes within bar (10% chance)
          notes.push({ duration: '8', type: 'note', tie: true });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 1.5 && rand > 0.5) {
          // Dotted quarter (10% chance) - creates syncopation
          notes.push({ duration: 'q.', type: 'note' });
          beatsInBar += 1.5;
        } else if (remainingBeats >= 1 && rand > 0.3) {
          // Quarter note (20% chance)
          notes.push({ duration: 'q', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5) {
          // Eighth note (30% chance)
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 0.5;
        }
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
  
  private static generateMediumPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        const rand = Math.random();
        
        if (remainingBeats >= 2 && rand > 0.8) {
          // Half note
          notes.push({ duration: 'h', type: 'note' });
          beatsInBar += 2;
        } else if (remainingBeats >= 1 && rand > 0.4) {
          // Quarter note
          notes.push({ 
            duration: 'q', 
            type: Math.random() > 0.85 ? 'rest' : 'note'
          });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5) {
          // Two eighth notes
          notes.push({ duration: '8', type: 'note' });
          notes.push({ 
            duration: '8', 
            type: Math.random() > 0.9 ? 'rest' : 'note'
          });
          beatsInBar += 1;
        } else {
          // Single eighth if half beat remaining (shouldn't happen often)
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 0.5;
        }
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
  
  private static generateHardPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType; tie?: boolean; dotted?: boolean }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        const rand = Math.random();
        
        if (remainingBeats >= 1 && rand > 0.85) {
          // Syncopated tie across beat
          notes.push({ duration: '8', type: 'note', tie: true });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 1 && rand > 0.7) {
          // Four sixteenth notes
          for (let i = 0; i < 4; i++) {
            notes.push({ 
              duration: '16', 
              type: Math.random() > 0.95 ? 'rest' : 'note'
            });
          }
          beatsInBar += 1;
        } else if (remainingBeats >= 1 && rand > 0.5) {
          // Quarter note
          notes.push({ 
            duration: 'q', 
            type: Math.random() > 0.85 ? 'rest' : 'note'
          });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5) {
          // Eighth notes
          notes.push({ duration: '8', type: 'note' });
          notes.push({ 
            duration: '8', 
            type: Math.random() > 0.9 ? 'rest' : 'note'
          });
          beatsInBar += 1;
        } else if (remainingBeats >= 0.25) {
          // Sixteenth notes to fill
          const sixteenthCount = Math.floor(remainingBeats / 0.25);
          for (let i = 0; i < sixteenthCount; i++) {
            notes.push({ duration: '16', type: 'note' });
          }
          beatsInBar += sixteenthCount * 0.25;
        }
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
  
  private static generateExpertPattern(bars: number, beatsPerBar: number): RhythmPattern {
    const notes: Array<{ duration: NoteDuration; type: NoteType; tie?: boolean; dotted?: boolean }> = [];
    
    for (let bar = 0; bar < bars; bar++) {
      let beatsInBar = 0;
      
      while (beatsInBar < beatsPerBar) {
        const remainingBeats = beatsPerBar - beatsInBar;
        const rand = Math.random();
        
        if (remainingBeats >= 2 && rand > 0.9) {
          // Quarter triplet group
          notes.push({ duration: 'q3', type: 'note' });
          notes.push({ duration: 'q3', type: 'note' });
          notes.push({ duration: 'q3', type: 'note' });
          beatsInBar += 2;
        } else if (remainingBeats >= 1.5 && rand > 0.85) {
          // Dotted quarter + eighth
          notes.push({ duration: 'q', type: 'note', dotted: true });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 2;
        } else if (remainingBeats >= 1 && rand > 0.8) {
          // Eighth triplet group
          notes.push({ duration: '83', type: 'note' });
          notes.push({ duration: '83', type: 'note' });
          notes.push({ duration: '83', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 1 && rand > 0.6) {
          // Complex syncopation with tie
          notes.push({ duration: '16', type: 'note' });
          notes.push({ duration: '8', type: 'note', tie: true });
          notes.push({ duration: '16', type: 'note' });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 1 && rand > 0.4) {
          // Dotted eighth + sixteenth + eighth
          notes.push({ duration: '8', type: 'note', dotted: true });
          notes.push({ duration: '16', type: 'note' });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 1;
        } else if (remainingBeats >= 1) {
          // Four sixteenth notes
          for (let i = 0; i < 4; i++) {
            notes.push({ duration: '16', type: 'note' });
          }
          beatsInBar += 1;
        } else if (remainingBeats >= 0.5) {
          // Two eighths
          notes.push({ duration: '8', type: 'note' });
          notes.push({ duration: '8', type: 'note' });
          beatsInBar += 1;
        } else {
          // Fill remaining with sixteenths
          const sixteenthCount = Math.floor(remainingBeats / 0.25);
          for (let i = 0; i < sixteenthCount; i++) {
            notes.push({ duration: '16', type: 'note' });
          }
          beatsInBar += sixteenthCount * 0.25;
        }
      }
    }
    
    return { bars, beatsPerBar, notes: this.bundleConsecutiveRests(notes) };
  }
}
