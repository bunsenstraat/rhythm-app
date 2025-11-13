// Pattern designer component for creating rhythm patterns

import type { RhythmPattern, NoteDuration, NoteType, TestResults } from './types';
import { SheetMusicRenderer } from './SheetMusicRenderer';
import { AudioEngine } from './AudioEngine';
import { Toast } from './Toast';
import { RhythmValidator } from './RhythmValidator';
import abcjs from 'abcjs';

export class PatternDesigner {
  private container: HTMLElement;
  private pattern: RhythmPattern;
  private onPatternChange: (pattern: RhythmPattern) => void;
  private sheetMusicRenderer: SheetMusicRenderer | null = null;
  private selectedDuration: NoteDuration = 'q';
  private selectedType: NoteType = 'note';
  private lastResults: TestResults | null = null;
  private audioEngine: AudioEngine;
  private isPlaying: boolean = false;
  private selectedNotes: Set<number> = new Set(); // Track selected note indices
  private barsPerLine: number = 4; // Default: 4 bars per line in sheet music

  constructor(
    container: HTMLElement, 
    onPatternChange: (pattern: RhythmPattern) => void,
    lastResults: TestResults | null = null,
    initialPattern: RhythmPattern | null = null
  ) {
    this.container = container;
    this.onPatternChange = onPatternChange;
    this.lastResults = lastResults;
    this.audioEngine = new AudioEngine();
    this.pattern = initialPattern || {
      bars: 4,
      beatsPerBar: 4,
      notes: [
        { duration: 'q', type: 'note' },
        { duration: 'q', type: 'note' },
        { duration: 'q', type: 'note' },
        { duration: 'q', type: 'note' }
      ]
    };
    this.render();
  }

  private render() {
    this.container.innerHTML = `
      <div class="pattern-designer">
        <h2>Design Your Rhythm Pattern</h2>
        
        ${this.lastResults ? this.renderLastScore() : ''}
        
        <div class="sheet-music-container" id="sheet-music"></div>
        
        <div class="selection-controls" id="selection-controls" style="display: none;">
          <div style="margin-bottom: 1rem;">
            <strong>Selected: <span id="selected-count">0</span> note(s)</strong>
            <button class="clear-selection-btn" id="clear-selection-btn">Clear Selection</button>
          </div>
          <div class="selection-actions">
            <div class="action-group">
              <label>Change Duration:</label>
              <button class="sel-action-btn" data-action="duration" data-value="q" title="Quarter Note">Q</button>
              <button class="sel-action-btn" data-action="duration" data-value="8" title="Eighth Note">8th</button>
              <button class="sel-action-btn" data-action="duration" data-value="16" title="Sixteenth Note">16th</button>
              <button class="sel-action-btn" data-action="duration" data-value="h" title="Half Note">H</button>
              <button class="sel-action-btn" data-action="duration" data-value="w" title="Whole Note">W</button>
              <button class="sel-action-btn" data-action="duration" data-value="q3" title="Quarter Triplet">Q3</button>
              <button class="sel-action-btn" data-action="duration" data-value="83" title="Eighth Triplet">8th3</button>
            </div>
            <div class="action-group">
              <label>Change Type:</label>
              <button class="sel-action-btn" data-action="type" data-value="note">Note</button>
              <button class="sel-action-btn" data-action="type" data-value="rest">Rest</button>
            </div>
            <div class="action-group">
              <label>Tie:</label>
              <button class="sel-action-btn" data-action="tie" data-value="add" title="Add tie to next note">Add Tie</button>
              <button class="sel-action-btn" data-action="tie" data-value="remove" title="Remove tie">Remove Tie</button>
            </div>
            <div class="action-group">
              <label>Dot:</label>
              <button class="sel-action-btn" data-action="dot" data-value="add" title="Add dot (1.5x duration)">Add Dot</button>
              <button class="sel-action-btn" data-action="dot" data-value="remove" title="Remove dot">Remove Dot</button>
            </div>
            <div class="action-group">
              <button class="sel-action-btn danger" data-action="delete">Delete Selected</button>
            </div>
          </div>
        </div>
        
        <div class="rhythm-editor">
          <div class="note-palette">
            <h3>Note Duration</h3>
            <div class="duration-buttons">
              <button class="duration-btn active" data-duration="q" title="Quarter Note">Q</button>
              <button class="duration-btn" data-duration="8" title="Eighth Note">8th</button>
              <button class="duration-btn" data-duration="16" title="Sixteenth Note">16th</button>
              <button class="duration-btn" data-duration="h" title="Half Note">H</button>
              <button class="duration-btn" data-duration="q3" title="Quarter Triplet">Q3</button>
              <button class="duration-btn" data-duration="83" title="Eighth Triplet">8th3</button>
            </div>
          </div>
          
          <div class="note-type-palette">
            <h3>Note Type</h3>
            <div class="type-buttons">
              <button class="type-btn active" data-type="note">Note</button>
              <button class="type-btn" data-type="rest">Rest</button>
            </div>
          </div>
        </div>
        
        <div class="notes-list" id="notes-list">
          ${this.renderNotesList()}
        </div>
        
        <div class="editor-controls">
          <button id="add-note-btn" class="action-btn">Add Note</button>
          <button id="play-pattern-btn" class="action-btn play-btn">▶️ Play Pattern</button>
          <button id="stop-pattern-btn" class="action-btn stop-btn" style="display: none;">⏹️ Stop</button>
          <button id="clear-all-btn" class="action-btn">Clear All</button>
        </div>
        
        <div class="playback-options">
          <label>
            <input type="checkbox" id="sustained-notes-toggle" ${this.getSustainedNotesEnabled() ? 'checked' : ''}>
            Play sustained notes (actual note durations)
          </label>
          <label style="margin-left: 1rem;">
            Note pitch: 
            <select id="note-pitch-select" style="padding: 0.3rem; margin-left: 0.5rem;">
              <option value="261.63">C4 (Middle C)</option>
              <option value="293.66">D4</option>
              <option value="329.63">E4</option>
              <option value="349.23">F4</option>
              <option value="392.00">G4</option>
              <option value="440.00" selected>A4</option>
              <option value="493.88">B4</option>
              <option value="523.25">C5</option>
            </select>
          </label>
        </div>
        
        <div class="rhythm-validation" id="rhythm-validation"></div>
        
        <div class="pattern-management">
          <h3>Pattern Management</h3>
          <div class="management-buttons">
            <button id="save-pattern-btn" class="mgmt-btn">💾 Save Pattern</button>
            <button id="load-pattern-btn" class="mgmt-btn">📂 Load Pattern</button>
            <button id="new-pattern-btn" class="mgmt-btn">📄 New Pattern</button>
            <button id="load-preset-btn" class="mgmt-btn">🎵 Load Preset Patterns</button>
          </div>
          <div id="saved-patterns-list" class="saved-patterns-list"></div>
          <div id="preset-patterns-list" class="preset-patterns-list"></div>
          
          <h3>ABC Notation Tools</h3>
          <div class="abc-tools">
            <button id="export-abc-btn" class="mgmt-btn">📤 Export to ABC</button>
            <button id="import-abc-btn" class="mgmt-btn">📥 Import from ABC</button>
          </div>
          
          <div class="sheet-music-settings" style="margin-top: 1rem;">
            <label for="bars-per-line">Bars per line: 
              <select id="bars-per-line" style="padding: 0.3rem; margin-left: 0.5rem;">
                <option value="2">2</option>
                <option value="4" selected>4</option>
                <option value="8">8</option>
                <option value="16">All</option>
              </select>
            </label>
          </div>
          <div id="abc-output" class="abc-output" style="display: none;">
            <label>ABC Notation:</label>
            <textarea id="abc-textarea" rows="6" readonly></textarea>
            <button id="copy-abc-btn" class="action-btn">📋 Copy to Clipboard</button>
          </div>
          <div id="abc-input" class="abc-input" style="display: none;">
            <label>Paste ABC Notation:</label>
            <textarea id="abc-input-textarea" rows="6" placeholder="Paste ABC notation here..."></textarea>
            <button id="parse-abc-btn" class="action-btn">✓ Parse ABC</button>
            <button id="cancel-abc-btn" class="action-btn">Cancel</button>
          </div>
        </div>
        
        <div class="pattern-presets">
          <h3>Quick Presets</h3>
          <button id="preset-quarters">Quarter Notes</button>
          <button id="preset-eighths">Eighth Notes</button>
          <button id="preset-syncopated">Syncopated</button>
          <button id="preset-triplets">Eighth Triplets</button>
        </div>
        
        <div class="controls">
          <div class="control-group">
            <label for="beats">Beats per Bar: <span id="beats-value">${this.pattern.beatsPerBar}</span></label>
            <input type="range" id="beats" min="2" max="8" value="${this.pattern.beatsPerBar}" />
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.renderSheetMusic();
  }

  private renderNotesList(): string {
    const noteNames: Record<string, string> = {
      'w': 'Whole',
      'h': 'Half',
      'q': 'Quarter',
      '8': 'Eighth',
      '16': 'Sixteenth',
      'q3': 'Qtr Triplet',
      '83': '8th Triplet'
    };

    const noteSymbols: Record<string, string> = {
      'w': 'W',
      'h': 'H',
      'q': 'Q',
      '8': '8th',
      '16': '16th',
      'q3': 'Q3',
      '83': '8th3'
    };

    const restSymbol = 'R';

    return this.pattern.notes.map((note, index) => {
      const isSelected = this.selectedNotes.has(index);
      const tieIndicator = note.tie ? '<span class="tie-indicator">~</span>' : '';
      const dotIndicator = note.dotted ? '<span class="dot-indicator">•</span>' : '';
      return `
      <div class="note-item ${isSelected ? 'selected' : ''}" data-index="${index}">
        <button class="delete-note-btn" data-index="${index}">×</button>
        <div class="note-symbol">${note.type === 'rest' ? restSymbol : noteSymbols[note.duration]}${dotIndicator}${tieIndicator}</div>
        <span class="note-label">${noteNames[note.duration]}<br>${note.type === 'rest' ? 'Rest' : 'Note'}</span>
      </div>
    `;
    }).join('');
  }

  private renderLastScore(): string {
    if (!this.lastResults) return '';
    
    const scoreColor = this.lastResults.score >= 80 ? '#10b981' : 
                       this.lastResults.score >= 60 ? '#f59e0b' : '#ef4444';
    
    return `
      <div class="last-score-banner" style="background: linear-gradient(135deg, ${scoreColor}22 0%, ${scoreColor}11 100%); border-left: 4px solid ${scoreColor}; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0 0 0.5rem 0; color: ${scoreColor};">Last Session Score</h3>
            <p style="margin: 0; opacity: 0.9;">
              ${this.lastResults.tappedNotes}/${this.lastResults.totalNotes} notes hit • 
              Avg accuracy: ${this.lastResults.accuracy.toFixed(0)}ms
            </p>
          </div>
          <div style="font-size: 3rem; font-weight: bold; color: ${scoreColor};">
            ${this.lastResults.score}
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners() {
    // Duration buttons
    const durationButtons = this.container.querySelectorAll('.duration-btn');
    durationButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        durationButtons.forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.selectedDuration = (e.currentTarget as HTMLElement).dataset.duration as NoteDuration;
      });
    });

    // Type buttons
    const typeButtons = this.container.querySelectorAll('.type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        typeButtons.forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.selectedType = (e.currentTarget as HTMLElement).dataset.type as NoteType;
      });
    });

    // Add note button
    this.container.querySelector('#add-note-btn')?.addEventListener('click', () => {
      this.addNote();
    });

    // Play pattern button
    this.container.querySelector('#play-pattern-btn')?.addEventListener('click', () => {
      this.playPattern();
    });

    this.container.querySelector('#stop-pattern-btn')?.addEventListener('click', () => {
      this.stopPattern();
    });

    // Sustained notes toggle
    this.container.querySelector('#sustained-notes-toggle')?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.setSustainedNotesEnabled(enabled);
      Toast.info(enabled ? 'Sustained notes enabled' : 'Sustained notes disabled');
    });

    // Note pitch selector
    const pitchSelect = this.container.querySelector('#note-pitch-select') as HTMLSelectElement;
    if (pitchSelect) {
      pitchSelect.value = this.getNotePitch().toString();
      pitchSelect.addEventListener('change', (e) => {
        const frequency = parseFloat((e.target as HTMLSelectElement).value);
        this.setNotePitch(frequency);
      });
    }

    // Clear all button
    this.container.querySelector('#clear-all-btn')?.addEventListener('click', () => {
      this.pattern.notes = [];
      this.updateDisplay();
    });

    // Note item click for selection (with multi-select support)
    const noteItems = this.container.querySelectorAll('.note-item');
    noteItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger selection if clicking the delete button
        if ((e.target as HTMLElement).classList.contains('delete-note-btn')) {
          return;
        }
        
        const index = parseInt((item as HTMLElement).dataset.index!);
        const isShiftKey = (e as MouseEvent).shiftKey;
        const isMetaOrCtrl = (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey;
        
        if (isMetaOrCtrl) {
          // Toggle individual selection
          if (this.selectedNotes.has(index)) {
            this.selectedNotes.delete(index);
          } else {
            this.selectedNotes.add(index);
          }
        } else if (isShiftKey && this.selectedNotes.size > 0) {
          // Range select from last selected to current
          const indices = Array.from(this.selectedNotes);
          const lastSelected = Math.max(...indices);
          const start = Math.min(lastSelected, index);
          const end = Math.max(lastSelected, index);
          for (let i = start; i <= end; i++) {
            this.selectedNotes.add(i);
          }
        } else {
          // Single select (clear others)
          this.selectedNotes.clear();
          this.selectedNotes.add(index);
        }
        
        this.updateSelectionDisplay();
      });
    });
    
    // Delete note buttons
    const deleteButtons = this.container.querySelectorAll('.delete-note-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering note selection
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index!);
        this.pattern.notes.splice(index, 1);
        this.selectedNotes.clear();
        this.updateDisplay();
      });
    });
    
    // Selection action buttons
    const selActionButtons = this.container.querySelectorAll('.sel-action-btn');
    selActionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action!;
        const value = (btn as HTMLElement).dataset.value;
        this.applySelectionAction(action, value);
      });
    });
    
    // Clear selection button
    this.container.querySelector('#clear-selection-btn')?.addEventListener('click', () => {
      this.selectedNotes.clear();
      this.updateSelectionDisplay();
    });

    // Beats slider
    const beatsInput = this.container.querySelector('#beats') as HTMLInputElement;
    beatsInput?.addEventListener('input', (e) => {
      const beats = parseInt((e.target as HTMLInputElement).value);
      this.pattern.beatsPerBar = beats;
      this.updateDisplay();
    });

    // Presets
    this.container.querySelector('#preset-quarters')?.addEventListener('click', () => this.applyPreset('quarters'));
    this.container.querySelector('#preset-eighths')?.addEventListener('click', () => this.applyPreset('eighths'));
    this.container.querySelector('#preset-syncopated')?.addEventListener('click', () => this.applyPreset('syncopated'));
    this.container.querySelector('#preset-triplets')?.addEventListener('click', () => this.applyPreset('triplets'));

    // Pattern management
    this.container.querySelector('#save-pattern-btn')?.addEventListener('click', () => this.savePattern());
    this.container.querySelector('#load-pattern-btn')?.addEventListener('click', () => this.toggleSavedPatternsList());
    this.container.querySelector('#new-pattern-btn')?.addEventListener('click', () => this.newPattern());
    this.container.querySelector('#load-preset-btn')?.addEventListener('click', () => this.togglePresetPatternsList());
    
    // ABC notation tools
    this.container.querySelector('#export-abc-btn')?.addEventListener('click', () => this.exportToABC());
    this.container.querySelector('#import-abc-btn')?.addEventListener('click', () => this.showABCImport());
    this.container.querySelector('#copy-abc-btn')?.addEventListener('click', () => this.copyABCToClipboard());
    this.container.querySelector('#parse-abc-btn')?.addEventListener('click', () => this.parseABCInput());
    this.container.querySelector('#cancel-abc-btn')?.addEventListener('click', () => this.hideABCInput());
    
    // Bars per line selector
    const barsPerLineSelect = this.container.querySelector('#bars-per-line') as HTMLSelectElement;
    barsPerLineSelect?.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLSelectElement).value);
      this.barsPerLine = value;
      this.renderSheetMusic(); // Re-render with new setting
    });
    
    // Load saved patterns list
    this.renderSavedPatternsList();
  }

  private addNote() {
    this.pattern.notes.push({
      duration: this.selectedDuration,
      type: this.selectedType
    });
    this.updateDisplay();
  }
  
  private updateSelectionDisplay() {
    console.log(`[PatternDesigner] Updating selection display for indices:`, Array.from(this.selectedNotes));
    
    // Update selected visual state on note items
    const noteItems = this.container.querySelectorAll('.note-item');
    noteItems.forEach((item, index) => {
      if (this.selectedNotes.has(index)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
    
    // Update selection controls visibility and count
    const selectionControls = this.container.querySelector('#selection-controls') as HTMLElement;
    const selectedCount = this.container.querySelector('#selected-count') as HTMLElement;
    
    if (selectionControls) {
      if (this.selectedNotes.size > 0) {
        selectionControls.style.display = 'block';
        if (selectedCount) {
          selectedCount.textContent = this.selectedNotes.size.toString();
        }
      } else {
        selectionControls.style.display = 'none';
      }
    }
    
    // Also highlight in sheet music if possible
    this.updateSheetMusicSelection();
  }
  
  private updateSheetMusicSelection() {
    // Highlight selected notes in sheet music
    const noteElements = this.container.querySelectorAll('.abcjs-note');
    noteElements.forEach((el, index) => {
      if (this.selectedNotes.has(index)) {
        el.classList.add('abcjs-highlight');
      } else {
        el.classList.remove('abcjs-highlight');
      }
    });
  }
  
  private applySelectionAction(action: string, value?: string) {
    if (this.selectedNotes.size === 0) return;
    
    const indices = Array.from(this.selectedNotes).sort((a, b) => a - b);
    
    switch (action) {
      case 'duration':
        if (value) {
          indices.forEach(index => {
            this.pattern.notes[index].duration = value as NoteDuration;
          });
        }
        break;
        
      case 'type':
        if (value) {
          indices.forEach(index => {
            this.pattern.notes[index].type = value as NoteType;
          });
        }
        break;
        
      case 'tie':
        if (value === 'add') {
          // Add tie to each selected note (ties to next note)
          indices.forEach(index => {
            // Can't tie the last note or a rest
            if (index < this.pattern.notes.length - 1 && this.pattern.notes[index].type === 'note') {
              this.pattern.notes[index].tie = true;
            }
          });
        } else if (value === 'remove') {
          // Remove tie from selected notes
          indices.forEach(index => {
            this.pattern.notes[index].tie = false;
          });
        }
        break;
        
      case 'dot':
        if (value === 'add') {
          // Add dot to selected notes (can't dot triplets)
          indices.forEach(index => {
            const note = this.pattern.notes[index];
            // Don't dot triplets as they have special timing
            if (note.duration !== 'q3' && note.duration !== '83') {
              this.pattern.notes[index].dotted = true;
            }
          });
        } else if (value === 'remove') {
          // Remove dot from selected notes
          indices.forEach(index => {
            this.pattern.notes[index].dotted = false;
          });
        }
        break;
        
      case 'delete':
        // Delete in reverse order to maintain indices
        indices.reverse().forEach(index => {
          this.pattern.notes.splice(index, 1);
        });
        this.selectedNotes.clear();
        break;
    }
    
    this.updateDisplay();
  }

  private playbackTimeout: number | null = null;

  private getSustainedNotesEnabled(): boolean {
    return localStorage.getItem('sustainedNotesEnabled') === 'true';
  }

  private setSustainedNotesEnabled(enabled: boolean) {
    localStorage.setItem('sustainedNotesEnabled', enabled ? 'true' : 'false');
  }

  private getNotePitch(): number {
    const saved = localStorage.getItem('notePitch');
    return saved ? parseFloat(saved) : 440.0;
  }

  private setNotePitch(frequency: number) {
    localStorage.setItem('notePitch', frequency.toString());
  }

  private async playPattern() {
    if (this.isPlaying) return;
    if (this.pattern.notes.length === 0) {
      Toast.error('Add some notes first!');
      return;
    }

    this.isPlaying = true;
    const playBtn = this.container.querySelector('#play-pattern-btn') as HTMLButtonElement;
    const stopBtn = this.container.querySelector('#stop-pattern-btn') as HTMLButtonElement;
    if (playBtn) {
      playBtn.style.display = 'none';
    }
    if (stopBtn) {
      stopBtn.style.display = 'inline-block';
    }

    await this.audioEngine.resume();

    // Calculate timing - use saved tempo or default to 120
    const savedTempo = localStorage.getItem('rhythmTrainerTempo');
    const tempo = savedTempo ? parseInt(savedTempo) : 120;
    const beatDuration = (60 / tempo) * 1000; // ms per beat
    
    const beatValues: Record<string, number> = {
      'w': 4,
      'h': 2,
      'q': 1,
      '8': 0.5,
      '16': 0.25,
      'q3': 2/3,
      '83': 1/3
    };

    const noteTimes: number[] = [];
    let currentTime = 0;
    
    this.pattern.notes.forEach((note) => {
      noteTimes.push(currentTime);
      let noteBeats = beatValues[note.duration];
      if (note.dotted) {
        noteBeats *= 1.5; // Dot adds 50% to duration
      }
      currentTime += noteBeats * beatDuration;
    });

    const totalDuration = currentTime;
    const startDelay = 0.1;
    const audioStartTime = this.audioEngine.getContextTime() + startDelay;
    
    // Add count-in (one bar)
    const countInBeats = this.pattern.beatsPerBar;
    const countInDuration = countInBeats * beatDuration;
    
    // Schedule count-in metronome clicks
    for (let i = 0; i < countInBeats; i++) {
      const beatTime = audioStartTime + (i * beatDuration / 1000);
      const isDownbeat = i === 0;
      this.audioEngine.playMetronome(beatTime, isDownbeat);
    }

    // Schedule metronome beats during pattern
    const totalBeats = Math.ceil(totalDuration / beatDuration);
    for (let i = 0; i < totalBeats; i++) {
      const beatTime = audioStartTime + ((countInDuration + i * beatDuration) / 1000);
      const isDownbeat = i % this.pattern.beatsPerBar === 0;
      this.audioEngine.playMetronome(beatTime, isDownbeat);
    }

    // Schedule pattern notes (after count-in, handle ties for sustained notes)
    const useSustainedNotes = this.getSustainedNotesEnabled();
    const notePitch = this.getNotePitch();
    this.pattern.notes.forEach((note, index) => {
      // Check if this note is tied from the previous note
      const previousNote = index > 0 ? this.pattern.notes[index - 1] : null;
      const isTiedFromPrevious = previousNote && previousNote.tie;
      
      // Play sound only for notes that aren't rests and aren't tied from previous
      if (note.type === 'note' && !isTiedFromPrevious) {
        const beatTime = audioStartTime + ((countInDuration + noteTimes[index]) / 1000);
        
        if (useSustainedNotes) {
          // Calculate total duration including tied notes
          let totalNoteBeats = beatValues[note.duration];
          if (note.dotted) {
            totalNoteBeats *= 1.5;
          }
          
          // Add duration of all subsequent tied notes
          let currentIndex = index;
          while (currentIndex < this.pattern.notes.length && this.pattern.notes[currentIndex].tie) {
            currentIndex++;
            if (currentIndex < this.pattern.notes.length) {
              let tiedNoteBeats = beatValues[this.pattern.notes[currentIndex].duration];
              if (this.pattern.notes[currentIndex].dotted) {
                tiedNoteBeats *= 1.5;
              }
              totalNoteBeats += tiedNoteBeats;
            }
          }
          
          const noteDurationSeconds = (totalNoteBeats * beatDuration) / 1000;
          this.audioEngine.playSustainedNote(beatTime, noteDurationSeconds, notePitch);
        } else {
          this.audioEngine.playPattern(beatTime);
        }
      }
    });

    // Reset button after playback (including count-in)
    this.playbackTimeout = window.setTimeout(() => {
      this.isPlaying = false;
      const playBtn = this.container.querySelector('#play-pattern-btn') as HTMLButtonElement;
      const stopBtn = this.container.querySelector('#stop-pattern-btn') as HTMLButtonElement;
      if (playBtn) {
        playBtn.style.display = 'inline-block';
      }
      if (stopBtn) {
        stopBtn.style.display = 'none';
      }
      this.playbackTimeout = null;
    }, countInDuration + totalDuration + (startDelay * 1000) + 500);
  }

  private async stopPattern() {
    if (!this.isPlaying) return;
    
    // Stop audio
    await this.audioEngine.stop();
    
    // Clear timeout
    if (this.playbackTimeout !== null) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
    
    // Reset UI
    this.isPlaying = false;
    const playBtn = this.container.querySelector('#play-pattern-btn') as HTMLButtonElement;
    const stopBtn = this.container.querySelector('#stop-pattern-btn') as HTMLButtonElement;
    if (playBtn) {
      playBtn.style.display = 'inline-block';
    }
    if (stopBtn) {
      stopBtn.style.display = 'none';
    }
    
    Toast.info('Playback stopped');
  }

  private applyPreset(preset: string) {
    switch (preset) {
      case 'quarters':
        // 4 quarter notes = 4 beats (one bar of 4/4)
        this.pattern.notes = [
          { duration: 'q', type: 'note' },
          { duration: 'q', type: 'note' },
          { duration: 'q', type: 'note' },
          { duration: 'q', type: 'note' }
        ];
        break;
      case 'eighths':
        // 8 eighth notes = 4 beats (one bar of 4/4)
        this.pattern.notes = [
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' }
        ];
        break;
      case 'syncopated':
        // Q + 8 + 8 + 8 + 8 + Q = 1 + 0.5 + 0.5 + 0.5 + 0.5 + 1 = 4 beats
        this.pattern.notes = [
          { duration: 'q', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'note' },
          { duration: '8', type: 'rest' },
          { duration: '8', type: 'note' },
          { duration: 'q', type: 'note' }
        ];
        break;
      case 'triplets':
        // 12 eighth triplets = 4 beats (one bar of 4/4)
        this.pattern.notes = [
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' },
          { duration: '83', type: 'note' }
        ];
        break;
    }
    
    this.updateDisplay();
  }

  private updateDisplay() {
    document.getElementById('beats-value')!.textContent = this.pattern.beatsPerBar.toString();
    
    // Clean up invalid selections (notes that were deleted)
    const validIndices = new Set<number>();
    this.selectedNotes.forEach(index => {
      if (index < this.pattern.notes.length) {
        validIndices.add(index);
      }
    });
    this.selectedNotes = validIndices;
    
    const notesList = this.container.querySelector('#notes-list');
    if (notesList) {
      notesList.innerHTML = this.renderNotesList();
      
      // Reattach note item click listeners
      const noteItems = notesList.querySelectorAll('.note-item');
      noteItems.forEach(item => {
        item.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).classList.contains('delete-note-btn')) {
            return;
          }
          
          const index = parseInt((item as HTMLElement).dataset.index!);
          const isShiftKey = (e as MouseEvent).shiftKey;
          const isMetaOrCtrl = (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey;
          
          if (isMetaOrCtrl) {
            if (this.selectedNotes.has(index)) {
              this.selectedNotes.delete(index);
            } else {
              this.selectedNotes.add(index);
            }
          } else if (isShiftKey && this.selectedNotes.size > 0) {
            const indices = Array.from(this.selectedNotes);
            const lastSelected = Math.max(...indices);
            const start = Math.min(lastSelected, index);
            const end = Math.max(lastSelected, index);
            for (let i = start; i <= end; i++) {
              this.selectedNotes.add(i);
            }
          } else {
            this.selectedNotes.clear();
            this.selectedNotes.add(index);
          }
          
          this.updateSelectionDisplay();
        });
      });
      
      // Reattach delete listeners
      const deleteButtons = notesList.querySelectorAll('.delete-note-btn');
      deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt((e.currentTarget as HTMLElement).dataset.index!);
          this.pattern.notes.splice(index, 1);
          this.selectedNotes.clear();
          this.updateDisplay();
        });
      });
    }
    
    this.renderSheetMusic();
    this.updateSelectionDisplay();
    this.renderValidation();
    this.onPatternChange(this.pattern);
  }

  private renderValidation() {
    const validationContainer = this.container.querySelector('#rhythm-validation');
    if (!validationContainer || this.pattern.notes.length === 0) {
      if (validationContainer) validationContainer.innerHTML = '';
      return;
    }

    const validation = RhythmValidator.validate(this.pattern);
    const barsAnalysis = RhythmValidator.analyzeBars(this.pattern);
    
    // Count complete vs incomplete bars
    const incompleteBars = barsAnalysis.filter(b => b.deficit < -0.001).length;
    const overflowBars = barsAnalysis.filter(b => b.deficit > 0.001).length;
    const completeBars = barsAnalysis.filter(b => Math.abs(b.deficit) < 0.001).length;

    let html = '<div class="validation-panel">';
    
    // Status indicator
    if (validation.isValid && validation.warnings.length === 0) {
      html += '<div class="validation-status validation-success">✓ Pattern is valid</div>';
    } else {
      html += '<div class="validation-status validation-warning">';
      html += `<strong>Pattern Analysis:</strong> ${completeBars} complete, `;
      if (incompleteBars > 0) html += `${incompleteBars} incomplete, `;
      if (overflowBars > 0) html += `${overflowBars} overflow`;
      html += '</div>';
    }

    // Errors
    if (validation.errors.length > 0) {
      html += '<div class="validation-errors">';
      validation.errors.forEach(error => {
        html += `<div class="validation-error">❌ ${error}</div>`;
      });
      html += '</div>';
    }

    // Warnings
    if (validation.warnings.length > 0) {
      html += '<div class="validation-warnings">';
      validation.warnings.forEach(warning => {
        html += `<div class="validation-warning-item">⚠️  ${warning}</div>`;
      });
      html += '</div>';
    }

    // Auto-correct buttons
    if (validation.errors.length > 0 || validation.warnings.length > 0) {
      html += '<div class="validation-actions">';
      
      if (incompleteBars > 0) {
        html += '<button id="auto-fill-btn" class="validation-btn">Auto-Fill with Rests</button>';
      }
      
      if (overflowBars > 0) {
        html += '<button id="auto-trim-btn" class="validation-btn">Trim Overflow (Add Ties)</button>';
      }
      
      html += '<button id="auto-correct-btn" class="validation-btn primary">Smart Auto-Correct</button>';
      html += '</div>';
    }

    html += '</div>';
    
    validationContainer.innerHTML = html;

    // Attach event listeners for auto-correct buttons
    this.container.querySelector('#auto-fill-btn')?.addEventListener('click', () => {
      this.pattern = RhythmValidator.autoFillRests(this.pattern);
      this.updateDisplay();
      Toast.success('Added rests to incomplete bars');
    });

    this.container.querySelector('#auto-trim-btn')?.addEventListener('click', () => {
      this.pattern = RhythmValidator.trimOverflow(this.pattern);
      this.updateDisplay();
      Toast.success('Trimmed overflow and added ties');
    });

    this.container.querySelector('#auto-correct-btn')?.addEventListener('click', () => {
      const result = RhythmValidator.autoCorrect(this.pattern);
      if (result.correctedPattern) {
        this.pattern = result.correctedPattern;
        this.updateDisplay();
        Toast.success('Pattern auto-corrected!');
      }
    });
  }

  private renderSheetMusic() {
    const sheetMusicContainer = document.getElementById('sheet-music');
    if (sheetMusicContainer) {
      if (this.sheetMusicRenderer) {
        this.sheetMusicRenderer.destroy();
      }
      this.sheetMusicRenderer = new SheetMusicRenderer(
        sheetMusicContainer, 
        this.pattern,
        (index: number, event: MouseEvent) => this.handleSheetMusicNoteClick(index, event),
        this.barsPerLine
      );
      this.sheetMusicRenderer.render();
    }
  }
  
  private handleSheetMusicNoteClick(index: number, event: MouseEvent) {
    console.log(`[PatternDesigner] Sheet music note clicked - index: ${index}, modifiers: Ctrl=${event.ctrlKey}, Meta=${event.metaKey}, Shift=${event.shiftKey}`);
    
    // Sync selection between sheet music and note list
    const isMetaOrCtrl = event.metaKey || event.ctrlKey;
    const isShiftKey = event.shiftKey;
    
    if (isMetaOrCtrl) {
      // Toggle individual selection
      if (this.selectedNotes.has(index)) {
        this.selectedNotes.delete(index);
        console.log(`[PatternDesigner] Removed index ${index} from selection`);
      } else {
        this.selectedNotes.add(index);
        console.log(`[PatternDesigner] Added index ${index} to selection`);
      }
    } else if (isShiftKey && this.selectedNotes.size > 0) {
      // Range select
      const indices = Array.from(this.selectedNotes);
      const lastSelected = Math.max(...indices);
      const start = Math.min(lastSelected, index);
      const end = Math.max(lastSelected, index);
      console.log(`[PatternDesigner] Range select from ${start} to ${end}`);
      for (let i = start; i <= end; i++) {
        this.selectedNotes.add(i);
      }
    } else {
      // Single select
      console.log(`[PatternDesigner] Single select - clearing previous selection and selecting index ${index}`);
      this.selectedNotes.clear();
      this.selectedNotes.add(index);
    }
    
    console.log(`[PatternDesigner] Current selection:`, Array.from(this.selectedNotes));
    this.updateSelectionDisplay();
  }

  getPattern(): RhythmPattern {
    return this.pattern;
  }

  // localStorage methods
  private savePattern() {
    const name = prompt('Enter a name for this pattern:');
    if (!name) return;

    const savedPatterns = this.getSavedPatterns();
    savedPatterns[name] = {
      pattern: this.pattern,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('rhythmPatterns', JSON.stringify(savedPatterns));
    this.renderSavedPatternsList();
    Toast.success(`Pattern "${name}" saved!`);
  }

  private loadPattern(name: string) {
    const savedPatterns = this.getSavedPatterns();
    if (savedPatterns[name]) {
      this.pattern = savedPatterns[name].pattern;
      this.updateDisplay();
      Toast.success(`Pattern "${name}" loaded!`);
    }
  }

  private deletePattern(name: string) {
    if (!confirm(`Delete pattern "${name}"?`)) return;
    
    const savedPatterns = this.getSavedPatterns();
    delete savedPatterns[name];
    localStorage.setItem('rhythmPatterns', JSON.stringify(savedPatterns));
    this.renderSavedPatternsList();
  }

  private newPattern() {
    if (this.pattern.notes.length > 0) {
      if (!confirm('Start a new pattern? Current pattern will be lost unless saved.')) {
        return;
      }
    }
    
    this.pattern = {
      bars: 4,
      beatsPerBar: 4,
      notes: [
        { duration: 'q', type: 'note' },
        { duration: 'q', type: 'note' },
        { duration: 'q', type: 'note' },
        { duration: 'q', type: 'note' }
      ]
    };
    this.updateDisplay();
  }

  private getSavedPatterns(): Record<string, { pattern: RhythmPattern; savedAt: string }> {
    const saved = localStorage.getItem('rhythmPatterns');
    return saved ? JSON.parse(saved) : {};
  }

  private toggleSavedPatternsList() {
    const list = this.container.querySelector('#saved-patterns-list') as HTMLElement;
    if (list.style.display === 'none' || !list.style.display) {
      list.style.display = 'block';
      this.renderSavedPatternsList();
    } else {
      list.style.display = 'none';
    }
  }

  private renderSavedPatternsList() {
    const list = this.container.querySelector('#saved-patterns-list');
    if (!list) return;

    const savedPatterns = this.getSavedPatterns();
    const patternNames = Object.keys(savedPatterns);

    if (patternNames.length === 0) {
      list.innerHTML = '<p style="color: #888; padding: 1rem; text-align: center;">No saved patterns yet.</p>';
      return;
    }

    list.innerHTML = patternNames.map(name => {
      const saved = savedPatterns[name];
      const date = new Date(saved.savedAt).toLocaleDateString();
      const noteCount = saved.pattern.notes.length;
      
      return `
        <div class="saved-pattern-item">
          <div class="pattern-info">
            <strong>${name}</strong>
            <small>${noteCount} notes • ${date}</small>
          </div>
          <div class="pattern-actions">
            <button class="load-btn" data-name="${name}">Load</button>
            <button class="delete-btn" data-name="${name}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners
    list.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = (e.currentTarget as HTMLElement).dataset.name!;
        this.loadPattern(name);
      });
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = (e.currentTarget as HTMLElement).dataset.name!;
        this.deletePattern(name);
      });
    });
  }
  
  // Preset patterns methods
  private async loadPresetPattern(filename: string) {
    try {
      // Construct the path - in production the base is /rhythm-app/, in dev it's /
      const basePath = import.meta.env.MODE === 'production' ? '/rhythm-app' : '';
      const response = await fetch(`${basePath}/patterns/${filename}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load preset pattern: ${response.statusText}`);
      }
      
      // Check if this is an ABC file or JSON file
      if (filename.endsWith('.abc')) {
        const abcContent = await response.text();
        const notes = this.parseABCNotation(abcContent);
        
        if (notes.length === 0) {
          throw new Error('Failed to parse ABC file');
        }
        
        // Extract name from ABC file (T: line) or use filename
        const titleMatch = abcContent.match(/^T:\s*(.+)$/m);
        const name = titleMatch ? titleMatch[1] : filename.replace('.abc', '');
        
        this.pattern.notes = notes;
        this.updateDisplay();
        Toast.success(`Loaded: ${name}`, 4000);
        Toast.info('Pattern imported from ABC notation', 5000);
      } else {
        // JSON file
        const presetData = await response.json();
        this.pattern = presetData.pattern;
        this.updateDisplay();
        Toast.success(`Loaded: ${presetData.name}`, 4000);
        Toast.info(presetData.description, 5000);
      }
    } catch (error) {
      console.error('Error loading preset pattern:', error);
      Toast.error('Failed to load preset pattern. Please try again.');
    }
  }
  
  private async togglePresetPatternsList() {
    const list = this.container.querySelector('#preset-patterns-list') as HTMLElement;
    if (list.style.display === 'none' || !list.style.display) {
      list.style.display = 'block';
      await this.renderPresetPatternsList();
    } else {
      list.style.display = 'none';
    }
  }
  
  private async renderPresetPatternsList() {
    const list = this.container.querySelector('#preset-patterns-list');
    if (!list) return;

    try {
      // Fetch the index of preset patterns
      const basePath = import.meta.env.MODE === 'production' ? '/rhythm-app' : '';
      const response = await fetch(`${basePath}/patterns/index.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load preset patterns index: ${response.statusText}`);
      }
      
      const index = await response.json();
      const patterns = index.patterns || [];

      if (patterns.length === 0) {
        list.innerHTML = '<p style="color: #888; padding: 1rem; text-align: center;">No preset patterns available.</p>';
        return;
      }

      // Group patterns by category
      const grouped: Record<string, any[]> = {};
      patterns.forEach((pattern: any) => {
        if (!grouped[pattern.category]) {
          grouped[pattern.category] = [];
        }
        grouped[pattern.category].push(pattern);
      });

      // Render grouped patterns
      let html = '';
      ['beginner', 'intermediate', 'advanced'].forEach(category => {
        if (grouped[category] && grouped[category].length > 0) {
          html += `
            <div class="preset-category">
              <h4 style="text-transform: capitalize; color: #3b82f6; margin: 1rem 0 0.5rem 0;">${category}</h4>
              ${grouped[category].map((pattern: any) => `
                <div class="preset-pattern-item">
                  <div class="pattern-info">
                    <strong>${pattern.name}</strong>
                  </div>
                  <div class="pattern-actions">
                    <button class="load-preset-btn" data-filename="${pattern.filename}">Load</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      });

      list.innerHTML = html;

      // Attach event listeners
      list.querySelectorAll('.load-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const filename = (e.currentTarget as HTMLElement).dataset.filename!;
          this.loadPresetPattern(filename);
        });
      });
    } catch (error) {
      console.error('Error rendering preset patterns list:', error);
      list.innerHTML = '<p style="color: #ef4444; padding: 1rem;">Failed to load preset patterns. Please try again.</p>';
    }
  }
  
  // ABC Notation Tools
  private exportToABC() {
    // Create a temporary SheetMusicRenderer to generate ABC notation
    const tempDiv = document.createElement('div');
    const renderer = new SheetMusicRenderer(tempDiv, this.pattern, undefined, this.barsPerLine);
    
    // Get the ABC notation string
    const abcNotation = (renderer as any).convertToABC();
    
    // Show the ABC output area
    const abcOutput = this.container.querySelector('#abc-output') as HTMLElement;
    const abcTextarea = this.container.querySelector('#abc-textarea') as HTMLTextAreaElement;
    const abcInput = this.container.querySelector('#abc-input') as HTMLElement;
    
    if (abcOutput && abcTextarea) {
      abcTextarea.value = abcNotation;
      abcOutput.style.display = 'block';
      abcInput.style.display = 'none';
      Toast.success('ABC notation generated!');
    }
  }
  
  private async copyABCToClipboard() {
    const abcTextarea = this.container.querySelector('#abc-textarea') as HTMLTextAreaElement;
    if (abcTextarea) {
      try {
        await navigator.clipboard.writeText(abcTextarea.value);
        Toast.success('ABC notation copied to clipboard!');
      } catch (error) {
        // Fallback for older browsers
        abcTextarea.select();
        document.execCommand('copy');
        Toast.success('ABC notation copied to clipboard!');
      }
    }
  }
  
  private showABCImport() {
    const abcInput = this.container.querySelector('#abc-input') as HTMLElement;
    const abcOutput = this.container.querySelector('#abc-output') as HTMLElement;
    const abcInputTextarea = this.container.querySelector('#abc-input-textarea') as HTMLTextAreaElement;
    
    if (abcInput && abcInputTextarea) {
      abcInput.style.display = 'block';
      abcOutput.style.display = 'none';
      abcInputTextarea.value = '';
      abcInputTextarea.focus();
    }
  }
  
  private hideABCInput() {
    const abcInput = this.container.querySelector('#abc-input') as HTMLElement;
    if (abcInput) {
      abcInput.style.display = 'none';
    }
  }
  
  private parseABCInput() {
    const abcInputTextarea = this.container.querySelector('#abc-input-textarea') as HTMLTextAreaElement;
    if (!abcInputTextarea || !abcInputTextarea.value.trim()) {
      Toast.error('Please paste ABC notation first');
      return;
    }
    
    try {
      const abcText = abcInputTextarea.value.trim();
      const notes = this.parseABCNotation(abcText);
      
      if (notes.length === 0) {
        Toast.error('No notes found in ABC notation');
        return;
      }
      
      // Update the pattern with the parsed notes
      this.pattern.notes = notes;
      this.updateDisplay();
      this.hideABCInput();
      Toast.success(`Imported ${notes.length} notes from ABC notation!`);
    } catch (error) {
      console.error('Error parsing ABC:', error);
      Toast.error('Failed to parse ABC notation. Please check the format.');
    }
  }
  
  /**
   * Parse ABC notation string into our note format
   * This is a simplified parser that handles the basics
   */
  private parseABCNotation(abc: string): Array<{ duration: NoteDuration; type: NoteType; dotted?: boolean; tie?: boolean }> {
    const notes: Array<{ duration: NoteDuration; type: NoteType; dotted?: boolean; tie?: boolean }> = [];
    
    try {
      // Use abcjs's built-in parser!
      const parsed = abcjs.parseOnly(abc);
      
      if (!parsed || !parsed[0]) {
        throw new Error('Failed to parse ABC notation');
      }
      
      const tune = parsed[0];
      
      // Count bars from the parsed structure
      let barCount = 0;
      if (tune.lines) {
        for (const line of tune.lines) {
          if (line.staff && line.staff[0] && line.staff[0].voices) {
            for (const voice of line.staff[0].voices) {
              // Count bar lines in this voice
              const bars = voice.filter((el: any) => el.el_type === 'bar');
              barCount += bars.length;
            }
          }
        }
      }
      
      // Extract notes from the parsed structure
      if (tune.lines) {
        for (const line of tune.lines) {
          if (line.staff && line.staff[0] && line.staff[0].voices) {
            for (const voice of line.staff[0].voices) {
              let inTriplet = false;
              let tripletCount = 0;
              
              for (const element of voice) {
                // Skip bar lines and other non-note elements
                if (element.el_type === 'bar') continue;
                
                // Handle notes and rests
                if (element.el_type === 'note') {
                  // Check if it's a rest
                  const isRest = element.rest;
                  
                  // Get duration - abcjs uses duration as a fraction of a whole note
                  // 1 = whole, 0.5 = half, 0.25 = quarter, 0.125 = eighth, 0.0625 = sixteenth
                  const abcDuration = element.duration || 0.25;
                  
                  // Track triplet state
                  if (element.startTriplet && typeof element.startTriplet === 'number') {
                    inTriplet = true;
                    tripletCount = element.startTriplet; // Usually 3
                  }
                  
                  let duration: NoteDuration = 'q';
                  let dotted = false;
                  
                  // Check if this note is part of a triplet group
                  if (inTriplet && tripletCount > 0) {
                    // Determine triplet type based on the base duration
                    // Quarter triplets: duration around 0.1667 (2/3 of 0.25)
                    // Eighth triplets: duration around 0.0833 (1/3 of 0.25)
                    if (abcDuration >= 0.15) {
                      duration = 'q3'; // Quarter triplet
                    } else {
                      duration = '83'; // Eighth triplet
                    }
                    
                    tripletCount--;
                    if (tripletCount === 0) {
                      inTriplet = false;
                    }
                  } else {
                    // Regular note duration conversion
                    // Convert ABC duration to our NoteDuration
                    if (Math.abs(abcDuration - 1.0) < 0.01) {
                    duration = 'w';
                  } else if (Math.abs(abcDuration - 0.75) < 0.01) {
                    duration = 'h';
                    dotted = true;
                  } else if (Math.abs(abcDuration - 0.5) < 0.01) {
                    duration = 'h';
                  } else if (Math.abs(abcDuration - 0.375) < 0.01) {
                    duration = 'q';
                    dotted = true;
                  } else if (Math.abs(abcDuration - 0.25) < 0.01) {
                    duration = 'q';
                  } else if (Math.abs(abcDuration - 0.1875) < 0.01) {
                    duration = '8';
                    dotted = true;
                  } else if (Math.abs(abcDuration - 0.125) < 0.01) {
                    duration = '8';
                  } else if (Math.abs(abcDuration - 0.09375) < 0.01) {
                    duration = '16';
                    dotted = true;
                  } else if (Math.abs(abcDuration - 0.0625) < 0.01) {
                    duration = '16';
                  }
                  }
                  
                  // Check for ties - abcjs may store this in different ways
                  // The tie connects this note to the NEXT note
                  const hasTie = element.startTie || element.tie || (element.pitches && element.pitches[0] && element.pitches[0].startTie);
                  
                  notes.push({
                    duration,
                    type: isRest ? 'rest' : 'note',
                    dotted,
                    tie: hasTie || false
                  });
                }
              }
            }
          }
        }
      }
      
      // Update the pattern's bar count from the parsed ABC
      if (barCount > 0) {
        this.pattern.bars = barCount;
      }
      
    } catch (error) {
      console.error('Error parsing ABC:', error);
      Toast.error('Failed to parse ABC notation. Please check the format.');
    }
    
    return notes;
  }

}
