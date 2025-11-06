// Sheet music renderer using ABC.js

import abcjs from 'abcjs';
import type { RhythmPattern, Note } from './types';

export class SheetMusicRenderer {
  private container: HTMLElement;
  private pattern: RhythmPattern;
  private onNoteClick?: (index: number, event: MouseEvent) => void;

  constructor(container: HTMLElement, pattern: RhythmPattern, onNoteClick?: (index: number, event: MouseEvent) => void) {
    this.container = container;
    this.pattern = pattern;
    this.onNoteClick = onNoteClick;
  }

  setCurrentNote(index: number) {
    this.highlightNote(index);
  }

  private highlightNote(index: number) {
    console.log(`[SheetMusic] Highlighting note at pattern index: ${index}`);
    
    // Remove previous highlights
    const elements = this.container.querySelectorAll('.abcjs-note');
    elements.forEach(el => el.classList.remove('abcjs-highlight'));
    
    // Highlight note by pattern index using data attribute
    let found = false;
    elements.forEach(el => {
      const patternIndex = parseInt((el as HTMLElement).dataset.patternIndex || '-1');
      if (patternIndex === index) {
        el.classList.add('abcjs-highlight');
        found = true;
        console.log(`[SheetMusic] Highlighted visual note with pattern index ${patternIndex}`);
      }
    });
    
    if (!found) {
      console.warn(`[SheetMusic] Could not find note with pattern index ${index}`);
    }
  }

  render() {
    // Clear container
    this.container.innerHTML = '';
    
    // Check if pattern has notes
    if (!this.pattern.notes || this.pattern.notes.length === 0) {
      this.container.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem;">No notes to display. Add notes to see sheet music.</p>';
      return;
    }
    
    // Convert pattern to ABC notation
    const abcNotation = this.convertToABC();
    console.log('ABC Notation:', abcNotation);
    
    // Render with ABC.js
    try {
      abcjs.renderAbc(this.container, abcNotation, {
        responsive: 'resize',
        staffwidth: 600,
        scale: 1.2
      });
      
      // Debug: log all classes found in the rendered SVG
      console.log('[SheetMusic] Rendered SVG structure:');
      const allElements = this.container.querySelectorAll('*');
      const uniqueClasses = new Set<string>();
      allElements.forEach(el => {
        if (el.classList.length > 0) {
          el.classList.forEach(className => uniqueClasses.add(className));
        }
      });
      console.log('[SheetMusic] All CSS classes found:', Array.from(uniqueClasses));
      
      // Try different selectors
      const noteSelectors = ['.abcjs-note', '.abcjs-note_selected', 'g[data-name="note"]', 'path[data-name="note"]', '.abcjs-n'];
      noteSelectors.forEach(selector => {
        const found = this.container.querySelectorAll(selector);
        console.log(`[SheetMusic] Selector '${selector}' found ${found.length} elements`);
      });
      
      // Attach click listeners to rendered notes with proper event handling
      if (this.onNoteClick) {
        // Get all SVG note elements - try different selectors
        let allNoteElements = this.container.querySelectorAll('.abcjs-note');
        
        if (allNoteElements.length === 0) {
          // Try alternative selectors if .abcjs-note doesn't work
          allNoteElements = this.container.querySelectorAll('[data-name="note"]');
        }
        
        console.log('[SheetMusic] Total notes rendered by ABC.js:', allNoteElements.length);
        console.log('[SheetMusic] Pattern has', this.pattern.notes.length, 'notes');
        
        // Create a mapping from visual note index to pattern note index
        // ABC.js renders both notes and rests, we need to map them correctly
        let patternIndex = 0;
        
        allNoteElements.forEach((el) => {
          // Make notes focusable and clickable
          (el as HTMLElement).style.cursor = 'pointer';
          (el as HTMLElement).tabIndex = 0;
          
          // Store the pattern index on the element for reference
          (el as HTMLElement).dataset.patternIndex = patternIndex.toString();
          console.log(`[SheetMusic] Mapping visual note ${patternIndex} to pattern index ${patternIndex}`);
          
          el.addEventListener('click', (e) => {
            if (this.onNoteClick) {
              const idx = parseInt((el as HTMLElement).dataset.patternIndex || '0');
              console.log(`[SheetMusic] Note clicked - pattern index: ${idx}`);
              // Pass the actual mouse event so modifiers work
              this.onNoteClick(idx, e as MouseEvent);
            }
          });
          
          // Also support keyboard selection
          el.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
              e.preventDefault();
              if (this.onNoteClick) {
                const idx = parseInt((el as HTMLElement).dataset.patternIndex || '0');
                this.onNoteClick(idx, new MouseEvent('click', {
                  bubbles: true,
                  shiftKey: (e as KeyboardEvent).shiftKey,
                  ctrlKey: (e as KeyboardEvent).ctrlKey,
                  metaKey: (e as KeyboardEvent).metaKey
                }));
              }
            }
          });
          
          patternIndex++;
        });
      }
    } catch (error) {
      console.error('Error rendering ABC:', error);
      this.container.innerHTML = '<p style="color: red;">Error rendering sheet music</p>';
    }
  }

  private convertToABC(): string {
    // ABC notation format:
    // X:1 (reference number)
    // M:4/4 (time signature)
    // L:1/4 (default note length - quarter note)
    // K:C perc (key - C with percussion staff)
    // Notes: C=quarter, C2=half, C4=whole, C/2=eighth, C/4=sixteenth
    // Rests: z=quarter rest, z2=half rest, etc.
    // Triplets: (3CDE = 3 notes in time of 2
    // Barlines: | separates measures
    // Beaming: Notes WITHOUT spaces are beamed together. Spaces break beams.
    
    const timeSignature = `${this.pattern.beatsPerBar}/4`;
    const beatValues: Record<string, number> = {
      'w': 4,
      'h': 2,
      'q': 1,
      '8': 0.5,
      '16': 0.25,
      'q3': 2/3,  // Quarter triplet = 2/3 of a beat
      '83': 1/3   // Eighth triplet = 1/3 of a beat
    };
    
    let abcNotes = '';
    let currentBarBeats = 0;
    let currentBeatInBar = 0; // Track position within bar for beaming
    let i = 0;
    
    // Convert each note to ABC notation with proper beaming
    while (i < this.pattern.notes.length) {
      const note = this.pattern.notes[i];
      
      // Check if this starts a triplet sequence
      if ((note.duration === 'q3' || note.duration === '83') && 
          i + 2 < this.pattern.notes.length &&
          this.pattern.notes[i + 1].duration === note.duration &&
          this.pattern.notes[i + 2].duration === note.duration) {
        
        // It's a triplet group - process 3 notes together
        const tripletNotes = [
          this.getNoteString(this.pattern.notes[i]),
          this.getNoteString(this.pattern.notes[i + 1]),
          this.getNoteString(this.pattern.notes[i + 2])
        ].join('');
        
        abcNotes += `(3${tripletNotes}`;
        
        // Add up triplet beats (3 triplets = 2 beats for quarter triplets, 1 beat for eighth triplets)
        const tripletBeats = note.duration === 'q3' ? 2 : 1;
        currentBarBeats += tripletBeats;
        currentBeatInBar += tripletBeats;
        i += 3; // Skip the next 2 notes
        
        // Add space after triplet to break beaming
        abcNotes += ' ';
      } else {
        // Regular note
        let noteBeats = beatValues[note.duration];
        if (note.dotted) {
          noteBeats *= 1.5; // Dot adds 50% to duration
        }
        
        // Determine if we should add a space before this note (to break beaming)
        // Rule: For eighth notes and shorter, beam by half-beat in 4/4 time
        const shouldBreakBeam = this.shouldBreakBeam(note.duration, currentBeatInBar);
        
        if (shouldBreakBeam && abcNotes.length > 0 && !abcNotes.endsWith(' ') && !abcNotes.endsWith('|')) {
          abcNotes += ' ';
        }
        
        const noteStr = this.getNoteString(note);
        // Add tie if this note has a tie marker
        abcNotes += noteStr + (note.tie ? '-' : '');
        
        currentBarBeats += noteBeats;
        currentBeatInBar += noteBeats;
        i++;
        
        // Add space after longer notes or to end beaming groups
        if (note.duration === 'q' || note.duration === 'h' || note.duration === 'w' || note.dotted) {
          abcNotes += ' ';
        }
      }
      
      // Check if we've completed a bar (with small tolerance for floating point)
      if (Math.abs(currentBarBeats - this.pattern.beatsPerBar) < 0.01) {
        abcNotes += '| ';
        currentBarBeats = 0;
        currentBeatInBar = 0;
      } else if (currentBarBeats > this.pattern.beatsPerBar + 0.01) {
        // We've exceeded the bar, add barline before this note
        // This shouldn't happen with well-formed patterns, but handle it gracefully
        abcNotes += '| ';
        currentBarBeats = beatValues[note.duration];
        currentBeatInBar = beatValues[note.duration];
      }
    }
    
    // Add final barline if not already added
    if (!abcNotes.trim().endsWith('|')) {
      abcNotes += '|';
    }
    
    // Build complete ABC notation
    return `X:1
M:${timeSignature}
L:1/4
K:C perc
${abcNotes}]`;
  }
  
  /**
   * Determines if beaming should be broken before this note
   * In 4/4 time, eighth notes should beam in groups of 2 (half-beat)
   * Don't beam across beat boundaries or middle of bar
   */
  private shouldBreakBeam(duration: string, currentBeatInBar: number): boolean {
    // Only beam eighth and sixteenth notes
    if (duration !== '8' && duration !== '16') {
      return false; // Quarters and longer don't beam anyway
    }
    
    // Break beam at the start of each beat (every 1.0 beats)
    // For eighth notes in 4/4: beam pairs together, break at each beat (1.0, 2.0, 3.0, 4.0)
    const beatBoundary = Math.round(currentBeatInBar);
    const isOnBeatBoundary = Math.abs(currentBeatInBar - beatBoundary) < 0.01 && beatBoundary > 0;
    
    return isOnBeatBoundary;
  }

  private getNoteString(note: Note): string {
    // Use 'B' for percussion notes (middle line)
    const pitch = note.type === 'rest' ? 'z' : 'B';
    
    // Map our durations to ABC notation lengths
    // ABC default is L:1/4 (quarter note), so:
    // C = quarter (1/4)
    // C2 = half (2/4)
    // C4 = whole (4/4)  
    // C/ = eighth (1/8)
    // C// = sixteenth (1/16)
    // C3/2 = dotted quarter (adds 50%)
    
    const durationMap: Record<string, string> = {
      'w': '4',      // whole = 4 quarters
      'h': '2',      // half = 2 quarters
      'q': '',       // quarter = default
      '8': '/',      // eighth = half of default
      '16': '//',    // sixteenth = quarter of default
      'q3': '',      // quarter triplet (handled in group)
      '83': '/'      // eighth triplet (handled in group)
    };
    
    const baseDuration = durationMap[note.duration] || '';
    
    // In ABC notation, dots are represented by multiplying the duration by 3/2
    // For example: B3/2 = dotted quarter, B/3/2 = dotted eighth
    let dottedDuration = baseDuration;
    if (note.dotted) {
      if (baseDuration === '') {
        dottedDuration = '3/2'; // dotted quarter
      } else if (baseDuration === '/') {
        dottedDuration = '/3/2'; // dotted eighth
      } else if (baseDuration === '//') {
        dottedDuration = '//3/2'; // dotted sixteenth
      } else if (baseDuration === '2') {
        dottedDuration = '3'; // dotted half (2 * 1.5 = 3)
      } else if (baseDuration === '4') {
        dottedDuration = '6'; // dotted whole (4 * 1.5 = 6)
      }
    }
    
    return pitch + dottedDuration;
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

