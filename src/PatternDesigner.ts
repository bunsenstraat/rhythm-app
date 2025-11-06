// Pattern designer component for creating rhythm patterns

import type { RhythmPattern, NoteDuration, NoteType, TestResults } from './types';
import { SheetMusicRenderer } from './SheetMusicRenderer';
import { AudioEngine } from './AudioEngine';

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
          <button id="clear-all-btn" class="action-btn">Clear All</button>
        </div>
        
        <div class="pattern-management">
          <h3>Pattern Management</h3>
          <div class="management-buttons">
            <button id="save-pattern-btn" class="mgmt-btn">💾 Save Pattern</button>
            <button id="load-pattern-btn" class="mgmt-btn">📂 Load Pattern</button>
            <button id="new-pattern-btn" class="mgmt-btn">📄 New Pattern</button>
          </div>
          <div id="saved-patterns-list" class="saved-patterns-list"></div>
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
      return `
      <div class="note-item ${isSelected ? 'selected' : ''}" data-index="${index}">
        <button class="delete-note-btn" data-index="${index}">×</button>
        <div class="note-symbol">${note.type === 'rest' ? restSymbol : noteSymbols[note.duration]}${tieIndicator}</div>
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

  private async playPattern() {
    if (this.isPlaying) return;
    if (this.pattern.notes.length === 0) {
      alert('Add some notes first!');
      return;
    }

    this.isPlaying = true;
    const playBtn = this.container.querySelector('#play-pattern-btn') as HTMLButtonElement;
    if (playBtn) {
      playBtn.textContent = '⏸️ Playing...';
      playBtn.disabled = true;
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
      const noteBeats = beatValues[note.duration];
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

    // Schedule pattern notes (after count-in, skip tied notes)
    this.pattern.notes.forEach((note, index) => {
      // Check if this note is tied from the previous note
      const previousNote = index > 0 ? this.pattern.notes[index - 1] : null;
      const isTiedFromPrevious = previousNote && previousNote.tie;
      
      // Play sound only for notes that aren't rests and aren't tied from previous
      if (note.type === 'note' && !isTiedFromPrevious) {
        const beatTime = audioStartTime + ((countInDuration + noteTimes[index]) / 1000);
        this.audioEngine.playPattern(beatTime);
      }
    });

    // Reset button after playback (including count-in)
    setTimeout(() => {
      this.isPlaying = false;
      if (playBtn) {
        playBtn.textContent = '▶️ Play Pattern';
        playBtn.disabled = false;
      }
    }, countInDuration + totalDuration + (startDelay * 1000) + 500);
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
    this.onPatternChange(this.pattern);
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
        (index: number, event: MouseEvent) => this.handleSheetMusicNoteClick(index, event)
      );
      this.sheetMusicRenderer.render();
    }
  }
  
  private handleSheetMusicNoteClick(index: number, event: MouseEvent) {
    // Sync selection between sheet music and note list
    const isMetaOrCtrl = event.metaKey || event.ctrlKey;
    const isShiftKey = event.shiftKey;
    
    if (isMetaOrCtrl) {
      // Toggle individual selection
      if (this.selectedNotes.has(index)) {
        this.selectedNotes.delete(index);
      } else {
        this.selectedNotes.add(index);
      }
    } else if (isShiftKey && this.selectedNotes.size > 0) {
      // Range select
      const indices = Array.from(this.selectedNotes);
      const lastSelected = Math.max(...indices);
      const start = Math.min(lastSelected, index);
      const end = Math.max(lastSelected, index);
      for (let i = start; i <= end; i++) {
        this.selectedNotes.add(i);
      }
    } else {
      // Single select
      this.selectedNotes.clear();
      this.selectedNotes.add(index);
    }
    
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
    alert(`Pattern "${name}" saved!`);
  }

  private loadPattern(name: string) {
    const savedPatterns = this.getSavedPatterns();
    if (savedPatterns[name]) {
      this.pattern = savedPatterns[name].pattern;
      this.updateDisplay();
      alert(`Pattern "${name}" loaded!`);
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
}
