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
    // Remove previous highlights
    const elements = this.container.querySelectorAll('.abcjs-note');
    elements.forEach(el => el.classList.remove('abcjs-highlight'));
    
    // Highlight current note by index
    const noteElements = Array.from(elements);
    if (noteElements[index]) {
      noteElements[index].classList.add('abcjs-highlight');
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
      
      // Attach click listeners to rendered notes
      if (this.onNoteClick) {
        const noteElements = this.container.querySelectorAll('.abcjs-note');
        noteElements.forEach((el, index) => {
          el.addEventListener('click', (e) => {
            if (this.onNoteClick) {
              this.onNoteClick(index, e as MouseEvent);
            }
          });
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
    let i = 0;
    
    // Convert each note to ABC notation with barlines
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
        
        abcNotes += `(3${tripletNotes} `;
        
        // Add up triplet beats (3 triplets = 2 beats for quarter triplets, 1 beat for eighth triplets)
        const tripletBeats = note.duration === 'q3' ? 2 : 1;
        currentBarBeats += tripletBeats;
        i += 3; // Skip the next 2 notes
      } else {
        // Regular note
        const noteStr = this.getNoteString(note);
        // Add tie if this note has a tie marker
        abcNotes += noteStr + (note.tie ? '-' : '') + ' ';
        currentBarBeats += beatValues[note.duration];
        i++;
      }
      
      // Check if we've completed a bar (with small tolerance for floating point)
      if (Math.abs(currentBarBeats - this.pattern.beatsPerBar) < 0.01) {
        abcNotes += '| ';
        currentBarBeats = 0;
      } else if (currentBarBeats > this.pattern.beatsPerBar + 0.01) {
        // We've exceeded the bar, add barline before this note
        // This shouldn't happen with well-formed patterns, but handle it gracefully
        abcNotes += '| ';
        currentBarBeats = beatValues[note.duration];
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

  private getNoteString(note: Note): string {
    // Use 'B' for percussion notes (middle line)
    const pitch = note.type === 'rest' ? 'z' : 'B';
    
    // Map our durations to ABC notation lengths
    // ABC default is L:1/4 (quarter note), so:
    // C = quarter (1/4)
    // C2 = half (2/4)
    // C4 = whole (4/4)  
    // C/ = eighth (1/8)
    // C/ = sixteenth (1/16)
    
    const durationMap: Record<string, string> = {
      'w': '4',      // whole = 4 quarters
      'h': '2',      // half = 2 quarters
      'q': '',       // quarter = default
      '8': '/',      // eighth = half of default
      '16': '//',    // sixteenth = quarter of default
      'q3': '',      // quarter triplet (handled in group)
      '83': '/'      // eighth triplet (handled in group)
    };
    
    return pitch + (durationMap[note.duration] || '');
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

