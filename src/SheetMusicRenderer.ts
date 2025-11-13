// Sheet music renderer using ABC.js

import abcjs from 'abcjs';
import type { RhythmPattern, Note, TestResults } from './types';
import { getToleranceForNote as getToleranceForNoteHelper, type ToleranceMode } from './toleranceConfig';

export class SheetMusicRenderer {
  private container: HTMLElement;
  private pattern: RhythmPattern;
  private onNoteClick?: (index: number, event: MouseEvent) => void;
  private barsPerLine: number = 4; // Default: 4 bars per line
  private toleranceMode: ToleranceMode = 'normal';

  constructor(container: HTMLElement, pattern: RhythmPattern, onNoteClick?: (index: number, event: MouseEvent) => void, barsPerLine: number = 4, toleranceMode: ToleranceMode = 'normal') {
    this.container = container;
    this.pattern = pattern;
    this.onNoteClick = onNoteClick;
    this.barsPerLine = barsPerLine;
    this.toleranceMode = toleranceMode;
  }

  setCurrentNote(index: number) {
    this.highlightNote(index);
  }

  /**
   * Annotate the sheet music with test results
   * Colors notes based on tap accuracy:
   * - Green: Hit correctly (within tolerance)
   * - Orange: Hit but timing was off (early/late)
   * - Red: Missed completely
   */
  annotateWithResults(results: TestResults) {
    console.log('[SheetMusic] Annotating with test results:', results);
    console.log('[SheetMusic] Pattern notes:', this.pattern.notes);
    console.log('[SheetMusic] Expected taps from RhythmPlayer:', results.expectedTaps);
    
    // Try different selectors to find note elements
    let elements = this.container.querySelectorAll('.abcjs-note');
    if (elements.length === 0) {
      // Try alternative selector
      elements = this.container.querySelectorAll('g[data-name="note"]');
      console.log('[SheetMusic] Using g[data-name="note"] selector, found', elements.length, 'elements');
    } else {
      console.log('[SheetMusic] Using .abcjs-note selector, found', elements.length, 'elements');
    }
    
    // Use the actual expected tap times from RhythmPlayer instead of recalculating
    // Map pattern note indices to expected tap times AND expectedTaps index
    const noteExpectedTimes = new Map<number, { expectedTime: number; expectedTapIndex: number }>();
    let expectedTapIndex = 0;
    
    for (let i = 0; i < this.pattern.notes.length; i++) {
      const note = this.pattern.notes[i];
      const previousNote = i > 0 ? this.pattern.notes[i - 1] : null;
      const isTiedFromPrevious = previousNote && previousNote.tie;
      
      // Only notes that should be tapped (not rests, not tied from previous)
      if (note.type === 'note' && !isTiedFromPrevious) {
        if (expectedTapIndex < results.expectedTaps.length) {
          noteExpectedTimes.set(i, {
            expectedTime: results.expectedTaps[expectedTapIndex],
            expectedTapIndex: expectedTapIndex
          });
          expectedTapIndex++;
        }
      }
    }
    
    console.log('[SheetMusic] Note expected times (using actual from RhythmPlayer):', Array.from(noteExpectedTimes.entries()));
    
    // Duration-based tolerance: faster notes = tighter tolerance
    const beatDuration = 500; // ms per beat at 120 BPM (60/120 * 1000)
    const beatValues: Record<string, number> = {
      'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, 'q3': 2/3, '83': 1/3
    };
    
    const getToleranceForNote = (note: Note): number => {
      const beats = beatValues[note.duration] * (note.dotted ? 1.5 : 1);
      const noteDuration = beats * beatDuration;
      // Use the tolerance config based on current mode
      return getToleranceForNoteHelper(noteDuration, this.toleranceMode);
    };
    
    // NEW APPROACH: Note-centric matching with forward-only tap selection
    // Taps can only be assigned in forward order - once we use tap N, 
    // we can only look at taps N+1, N+2, ... for subsequent notes
    let searchStartIndex = 0; // Only search taps from this index forward
    const usedTapIndices = new Set<number>();
    const noteHits = new Map<number, { hit: boolean; accuracy: number; tapIndex?: number }>();
    
    // Mark all notes as missed initially
    for (const [noteIndex, _] of noteExpectedTimes) {
      noteHits.set(noteIndex, { hit: false, accuracy: 0 });
    }
    
    // For each expected note (in order), find the best matching unused tap
    // ONLY searching forward from the last assigned tap
    for (const [noteIndex, noteInfo] of noteExpectedTimes) {
      const note = this.pattern.notes[noteIndex];
      const tolerance = getToleranceForNote(note);
      const expectedTime = noteInfo.expectedTime;
      const expectedTapIdx = noteInfo.expectedTapIndex;
      
      let bestTapIndex = -1;
      let bestDiff = Infinity;
      
      // Search through taps starting from searchStartIndex (forward only)
      for (let tapIndex = searchStartIndex; tapIndex < results.taps.length; tapIndex++) {
        if (usedTapIndices.has(tapIndex)) continue; // Skip already-used taps
        
        const tap = results.taps[tapIndex];
        const diff = Math.abs(tap.timestamp - expectedTime);
        
        // Prefer taps that are closer in time, within this note's tolerance
        if (diff < bestDiff && diff < tolerance) {
          bestDiff = diff;
          bestTapIndex = tapIndex;
        }
        
        // Stop searching if we've gone too far past the expected time
        // BUT: allow checking a bit further to catch early taps for next notes
        // Only break if we're beyond the tolerance window
        if (tap.timestamp > expectedTime + tolerance * 2) {
          break;
        }
      }
      
      // If we found a suitable tap, assign it to this note
      if (bestTapIndex !== -1) {
        const tap = results.taps[bestTapIndex];
        usedTapIndices.add(bestTapIndex);
        
        // Move the search pointer forward: next note must use a tap >= this one
        searchStartIndex = bestTapIndex + 1;
        
        // Calculate accuracy: positive = late, negative = early
        const accuracy = tap.timestamp - expectedTime;
        
        noteHits.set(noteIndex, {
          hit: true,
          accuracy: accuracy,
          tapIndex: bestTapIndex
        });
        
        // Mark the tap with the expectedTaps index (NOT pattern index!)
        // This is what the timing table uses
        tap.noteIndex = expectedTapIdx;
        
        console.log(`[SheetMusic] Note ${noteIndex} (expectedTapsIndex: ${expectedTapIdx}, expected: ${expectedTime}ms, tolerance: ${tolerance.toFixed(0)}ms) matched to tap ${bestTapIndex} (actual: ${tap.timestamp}ms, diff: ${bestDiff.toFixed(0)}ms, accuracy: ${accuracy.toFixed(0)}ms)`);
      } else {
        console.log(`[SheetMusic] Note ${noteIndex} (expectedTapsIndex: ${expectedTapIdx}, expected: ${expectedTime}ms, tolerance: ${tolerance.toFixed(0)}ms) - NO MATCHING TAP FOUND (missed)`);
      }
    }
    
    // Report unused taps (extra taps that didn't match any note)
    const unusedTaps = results.taps.filter((_, idx) => !usedTapIndices.has(idx));
    if (unusedTaps.length > 0) {
      console.log(`[SheetMusic] ${unusedTaps.length} extra taps that didn't match any note:`, unusedTaps.map(t => t.timestamp));
    }
    
    console.log('[SheetMusic] Note hits map:', Array.from(noteHits.entries()));
    
    // Build a map of which pattern notes should be tappable (for coloring)
    const tappableNoteIndices = Array.from(noteExpectedTimes.keys());
    console.log('[SheetMusic] Tappable note indices:', tappableNoteIndices);
    console.log('[SheetMusic] Visual note elements found:', elements.length);
    
    // Apply colors to the SVG elements
    // Match visual notes to pattern notes, skipping tied notes and rests
    let visualNoteIndex = 0;
    
    for (let i = 0; i < this.pattern.notes.length; i++) {
      const note = this.pattern.notes[i];
      const previousNote = i > 0 ? this.pattern.notes[i - 1] : null;
      const isTiedFromPrevious = previousNote && previousNote.tie;
      
      if (note.type === 'note') {
        // Only color notes that should have been tapped (not tied from previous)
        if (!isTiedFromPrevious && visualNoteIndex < elements.length) {
          // Check if this pattern note index has a hit record
          if (noteHits.has(i)) {
            const el = elements[visualNoteIndex];
            const hitInfo = noteHits.get(i)!;
            
            let color = '#000000';
            if (!hitInfo.hit) {
              color = '#ef4444'; // Red - missed
            } else if (Math.abs(hitInfo.accuracy) < 50) {
              color = '#22c55e'; // Green - perfect (< 50ms)
            } else {
              color = '#f59e0b'; // Orange - timing off
            }
            
            console.log(`[SheetMusic] Coloring visual note ${visualNoteIndex} (pattern index ${i}): ${color} (hit: ${hitInfo.hit}, accuracy: ${hitInfo.accuracy}ms)`);
            
            // Find all paths in this note group and use inline styles for highest specificity
            const notePaths = el.querySelectorAll('path');
            console.log(`[SheetMusic] Found ${notePaths.length} paths in note element`);
            
            notePaths.forEach(path => {
              (path as SVGPathElement).style.fill = color;
              (path as SVGPathElement).style.stroke = color;
            });
            
            // Also color child elements with fill attribute
            const fillElements = el.querySelectorAll('[fill]');
            fillElements.forEach(fillEl => {
              (fillEl as SVGElement).style.fill = color;
              if ((fillEl as SVGElement).hasAttribute('stroke')) {
                (fillEl as SVGElement).style.stroke = color;
              }
            });
          } else {
            console.log(`[SheetMusic] Visual note ${visualNoteIndex} (pattern index ${i}) - NO HIT INFO (unexpected)`);
          }
        }
        visualNoteIndex++;
      }
    }
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
    let barCount = 0; // Track number of completed bars
    let i = 0;
    
    // Debug: Log all note durations to see what we have
    console.log('[SheetMusic] Pattern notes overview:', this.pattern.notes.map((n, idx) => ({
      idx,
      duration: n.duration,
      type: n.type
    })));
    
    // Convert each note to ABC notation with proper beaming
    while (i < this.pattern.notes.length) {
      const note = this.pattern.notes[i];
      
      // Check if this starts a triplet sequence
      if ((note.duration === 'q3' || note.duration === '83') && 
          i + 2 < this.pattern.notes.length &&
          this.pattern.notes[i + 1].duration === note.duration &&
          this.pattern.notes[i + 2].duration === note.duration) {
        
        console.log(`[SheetMusic] Found triplet group at index ${i}:`, {
          note0: { duration: this.pattern.notes[i].duration, type: this.pattern.notes[i].type },
          note1: { duration: this.pattern.notes[i + 1].duration, type: this.pattern.notes[i + 1].type },
          note2: { duration: this.pattern.notes[i + 2].duration, type: this.pattern.notes[i + 2].type }
        });
        
        // It's a triplet group - process 3 notes together
        const tripletNotes = [
          this.getNoteString(this.pattern.notes[i]),
          this.getNoteString(this.pattern.notes[i + 1]),
          this.getNoteString(this.pattern.notes[i + 2])
        ].join('');
        
        console.log(`[SheetMusic] Triplet ABC output: (3${tripletNotes}`);
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
        barCount++;
        abcNotes += '| ';
        
        // Add line break after every barsPerLine bars
        if (barCount % this.barsPerLine === 0) {
          abcNotes += '\n';
        }
        
        currentBarBeats = 0;
        currentBeatInBar = 0;
      } else if (currentBarBeats > this.pattern.beatsPerBar + 0.01) {
        // We've exceeded the bar, add barline before this note
        // This shouldn't happen with well-formed patterns, but handle it gracefully
        barCount++;
        abcNotes += '| ';
        
        // Add line break after every barsPerLine bars
        if (barCount % this.barsPerLine === 0) {
          abcNotes += '\n';
        }
        
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

