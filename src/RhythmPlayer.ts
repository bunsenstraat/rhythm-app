// Rhythm player that plays the pattern and detects taps

import type { RhythmPattern, TapEvent } from './types';
import { AudioEngine } from './AudioEngine';
import { SheetMusicRenderer } from './SheetMusicRenderer';
import { Toast } from './Toast';

export class RhythmPlayer {
  private container: HTMLElement;
  private pattern: RhythmPattern;
  private tempo: number;
  private audioEngine: AudioEngine;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private currentNoteIndex: number = 0;
  private intervalId: number | null = null;
  private taps: TapEvent[] = [];
  private expectedTaps: number[] = [];
  private noteTimes: number[] = []; // Actual time for each note in ms
  private onComplete: (taps: TapEvent[], expectedTaps: number[]) => void;
  private sheetMusicRenderer: SheetMusicRenderer | null = null;
  private practiceMode: boolean = true; // Practice mode plays pattern, test mode only plays metronome

  constructor(
    container: HTMLElement,
    pattern: RhythmPattern,
    tempo: number,
    audioEngine: AudioEngine,
    onComplete: (taps: TapEvent[], expectedTaps: number[]) => void
  ) {
    this.container = container;
    this.pattern = pattern;
    this.tempo = tempo;
    this.audioEngine = audioEngine;
    this.onComplete = onComplete;
  }

  async start() {
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem('rhythmTrainerMode');
    if (savedMode !== null) {
      this.practiceMode = savedMode === 'practice';
    }
    
    await this.audioEngine.resume();
    
    // Calculate note times and expected taps
    this.calculateNoteTimes();
    
    this.render();
    // Don't auto-start playback - wait for user to click Start
  }

  private calculateNoteTimes() {
    const beatDuration = (60 / this.tempo) * 1000; // ms per beat
    
    // Beat values for each note duration
    const beatValues: Record<string, number> = {
      'w': 4,
      'h': 2,
      'q': 1,
      '8': 0.5,
      '16': 0.25,
      'q3': 2/3,  // Quarter triplet
      '83': 1/3   // Eighth triplet
    };
    
    this.noteTimes = [];
    this.expectedTaps = [];
    let currentTime = 0;
    
    this.pattern.notes.forEach((note, index) => {
      this.noteTimes.push(currentTime);
      
      // Add to expected taps if it's a note (not a rest) and not tied from previous note
      const previousNote = index > 0 ? this.pattern.notes[index - 1] : null;
      const isTiedFromPrevious = previousNote && previousNote.tie;
      
      if (note.type === 'note' && !isTiedFromPrevious) {
        this.expectedTaps.push(currentTime);
      }
      
      // Move forward by the note's duration (with dot if applicable)
      let noteBeats = beatValues[note.duration];
      if (note.dotted) {
        noteBeats *= 1.5; // Dot adds 50% to duration
      }
      currentTime += noteBeats * beatDuration;
    });
  }

  private render() {
    const totalNotes = this.pattern.notes.filter(n => n.type === 'note').length;
    const modeText = this.practiceMode ? '🎵 Practice Mode' : '🎯 Test Mode';
    const modeDesc = this.practiceMode ? 'You will hear the pattern' : 'Only metronome, no pattern sound';
    
    this.container.innerHTML = `
      <div class="rhythm-player">
        <h2 id="player-title">Ready to Play</h2>
        
        <div class="mode-toggle">
          <button id="practice-mode-btn" class="mode-btn ${this.practiceMode ? 'active' : ''}" ${this.isPlaying ? 'disabled' : ''}>
            🎵 Practice Mode
          </button>
          <button id="test-mode-btn" class="mode-btn ${!this.practiceMode ? 'active' : ''}" ${this.isPlaying ? 'disabled' : ''}>
            🎯 Test Mode
          </button>
        </div>
        
        <p style="color: #888; margin: 0.5rem 0;">${modeDesc}</p>
        
        <button id="start-playback-btn" class="start-playback-btn" style="${this.isPlaying ? 'display: none;' : ''}">
          🚀 Start ${modeText}
        </button>
        
        <div class="sheet-music-container" id="sheet-music-player"></div>
        
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        
        <div class="current-note" id="current-note">
          Note: <span id="note-number">0</span> / ${this.pattern.notes.length}
        </div>
        
        <div class="tap-button-container">
          <button id="tap-button" class="tap-button" ${!this.isPlaying ? 'disabled' : ''}>
            TAP
          </button>
        </div>
        
        <div class="tap-counter">
          Taps: <span id="tap-count">0</span> / ${totalNotes}
        </div>
      </div>
    `;

    // Start playback button
    const startBtn = this.container.querySelector('#start-playback-btn');
    startBtn?.addEventListener('click', () => this.beginPlayback());

    const tapButton = this.container.querySelector('#tap-button') as HTMLButtonElement;
    tapButton.addEventListener('click', () => this.handleTap());
    
    // Mode toggle buttons (disabled during playback)
    const practiceModeBtn = this.container.querySelector('#practice-mode-btn');
    const testModeBtn = this.container.querySelector('#test-mode-btn');
    
    practiceModeBtn?.addEventListener('click', () => this.toggleMode(true));
    testModeBtn?.addEventListener('click', () => this.toggleMode(false));
    
    // Also allow spacebar for tapping
    document.addEventListener('keydown', this.handleKeyPress);
    
    // Render sheet music
    const sheetMusicContainer = document.getElementById('sheet-music-player');
    if (sheetMusicContainer) {
      // Use 4 bars per line for the player view
      this.sheetMusicRenderer = new SheetMusicRenderer(sheetMusicContainer, this.pattern, undefined, 4);
      this.sheetMusicRenderer.render();
    }
  }

  private toggleMode(practiceMode: boolean) {
    if (this.isPlaying) {
      Toast.error('Cannot change mode during playback');
      return;
    }
    
    this.practiceMode = practiceMode;
    
    // Save mode to localStorage
    localStorage.setItem('rhythmTrainerMode', practiceMode ? 'practice' : 'test');
    
    // Re-render to update UI
    this.render();
  }

  private async beginPlayback() {
    this.isPlaying = true;
    this.taps = [];
    this.currentNoteIndex = 0;
    
    // Hide start button and enable tap button
    const startBtn = this.container.querySelector('#start-playback-btn') as HTMLElement;
    const tapBtn = this.container.querySelector('#tap-button') as HTMLButtonElement;
    const practiceModeBtn = this.container.querySelector('#practice-mode-btn') as HTMLButtonElement;
    const testModeBtn = this.container.querySelector('#test-mode-btn') as HTMLButtonElement;
    
    if (startBtn) startBtn.style.display = 'none';
    if (tapBtn) tapBtn.disabled = false;
    if (practiceModeBtn) practiceModeBtn.disabled = true;
    if (testModeBtn) testModeBtn.disabled = true;
    
    this.startPlayback();
  }

  private handleKeyPress = (e: KeyboardEvent) => {
    if (e.code === 'Space' && this.isPlaying) {
      e.preventDefault();
      this.handleTap();
    }
  };

  private startPlayback() {
    const beatDuration = (60 / this.tempo) * 1000; // ms per beat
    const countInBeats = this.pattern.beatsPerBar; // 1 bar count-in
    const countInDuration = countInBeats * beatDuration;
    
    // Calculate total duration including the last note's duration
    const beatValues: Record<string, number> = {
      'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, 'q3': 2/3, '83': 1/3
    };
    const lastNoteStart = this.noteTimes[this.noteTimes.length - 1] || 0;
    const lastNoteDuration = this.pattern.notes.length > 0 
      ? beatValues[this.pattern.notes[this.pattern.notes.length - 1].duration] * beatDuration 
      : beatDuration;
    const totalDuration = lastNoteStart + lastNoteDuration;
    
    // Small delay to ensure everything is ready
    const startDelay = 0.1; // 100ms
    
    // Synchronize audio and visual timers
    const audioContextStartTime = this.audioEngine.getContextTime() + startDelay;
    this.startTime = Date.now() + (startDelay * 1000);
    
    // Schedule count-in metronome clicks
    for (let i = 0; i < countInBeats; i++) {
      const beatTime = audioContextStartTime + (i * beatDuration / 1000);
      const isDownbeat = i === 0;
      this.audioEngine.playMetronome(beatTime, isDownbeat);
    }
    
    // Schedule continuous metronome during pattern (every beat)
    const totalBeatsInPattern = Math.ceil(totalDuration / beatDuration);
    for (let i = 0; i < totalBeatsInPattern; i++) {
      const beatTime = audioContextStartTime + ((countInDuration + i * beatDuration) / 1000);
      const isDownbeat = i % this.pattern.beatsPerBar === 0;
      this.audioEngine.playMetronome(beatTime, isDownbeat);
    }
    
    // Schedule pattern sounds (only in practice mode and only on actual notes, not rests or tied notes)
    if (this.practiceMode) {
      this.pattern.notes.forEach((note, index) => {
        // Check if this note is tied from the previous note
        const previousNote = index > 0 ? this.pattern.notes[index - 1] : null;
        const isTiedFromPrevious = previousNote && previousNote.tie;
        
        // Play sound only for notes that aren't rests and aren't tied from previous
        if (note.type === 'note' && !isTiedFromPrevious) {
          const noteTime = this.noteTimes[index];
          const beatTime = audioContextStartTime + ((countInDuration + noteTime) / 1000);
          this.audioEngine.playPattern(beatTime);
        }
      });
    }
    
    // Update UI
    this.intervalId = window.setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const totalWithCountIn = countInDuration + totalDuration;
      const progress = Math.min(elapsed / totalWithCountIn, 1);
      
      const progressFill = this.container.querySelector('#progress-fill') as HTMLElement;
      const noteNumber = this.container.querySelector('#note-number') as HTMLElement;
      const playerTitle = this.container.querySelector('#player-title') as HTMLElement;
      
      // Update title based on count-in or pattern
      if (elapsed < countInDuration) {
        // During count-in
        const countBeat = Math.floor(elapsed / beatDuration) + 1;
        if (playerTitle) {
          const modeText = this.practiceMode ? 'Practice' : 'Test';
          playerTitle.textContent = `${modeText} - Count In: ${countBeat}`;
        }
        if (noteNumber) {
          noteNumber.textContent = '0';
        }
      } else {
        // During pattern
        if (playerTitle) {
          playerTitle.textContent = 'Tap Along!';
        }
        
        // Find current note based on time
        const patternTime = elapsed - countInDuration;
        let currentNote = 0;
        for (let i = 0; i < this.noteTimes.length; i++) {
          if (patternTime >= this.noteTimes[i]) {
            currentNote = i + 1;
          }
        }
        this.currentNoteIndex = Math.min(currentNote, this.pattern.notes.length);
        
        if (noteNumber) {
          noteNumber.textContent = this.currentNoteIndex.toString();
        }
        
        // Update sheet music highlight
        if (this.sheetMusicRenderer && this.currentNoteIndex > 0) {
          this.sheetMusicRenderer.setCurrentNote(this.currentNoteIndex - 1);
        }
      }
      
      if (progressFill) {
        progressFill.style.width = `${progress * 100}%`;
      }
      
      if (progress >= 1) {
        this.stop();
      }
    }, 50);
  }

  private handleTap() {
    if (!this.isPlaying) return;
    
    // Ensure AudioContext is running and play tap feedback sound immediately
    this.audioEngine.resume();
    this.audioEngine.playTap();
    
    const beatDuration = (60 / this.tempo) * 1000;
    const countInDuration = this.pattern.beatsPerBar * beatDuration;
    const tapTime = Date.now() - this.startTime;
    
    // Adjust tap time to be relative to pattern start (after count-in)
    const patternTapTime = tapTime - countInDuration;
    
    // Allow taps within a tolerance window before pattern start (early anticipation)
    // e.g., if you tap 50ms before beat 1, it counts as -50ms for the first note
    const earlyTapTolerance = 200; // Allow taps up to 200ms before pattern starts
    
    // Ignore taps that are too early (more than tolerance before pattern start)
    if (patternTapTime < -earlyTapTolerance) {
      console.log(`[Tap] Too early: ${patternTapTime.toFixed(0)}ms (ignored)`);
      return;
    }
    
    // Find closest expected tap
    let closestExpected = -1;
    let minDiff = Infinity;
    
    for (const expectedTime of this.expectedTaps) {
      const diff = Math.abs(patternTapTime - expectedTime);
      if (diff < minDiff && diff < beatDuration / 2) {
        minDiff = diff;
        closestExpected = expectedTime;
      }
    }
    
    if (closestExpected !== -1) {
      const accuracy = patternTapTime - closestExpected;
      this.taps.push({
        timestamp: patternTapTime,
        expectedTime: closestExpected,
        accuracy
      });
      
      // Visual feedback
      const tapButton = this.container.querySelector('#tap-button') as HTMLButtonElement;
      tapButton.classList.add('tapped');
      setTimeout(() => tapButton.classList.remove('tapped'), 100);
      
      // Update counter
      const tapCount = this.container.querySelector('#tap-count');
      if (tapCount) {
        tapCount.textContent = this.taps.length.toString();
      }
    }
  }

  private stop() {
    this.isPlaying = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    document.removeEventListener('keydown', this.handleKeyPress);
    
    // Calculate results
    this.onComplete(this.taps, this.expectedTaps);
  }

  destroy() {
    this.stop();
    if (this.sheetMusicRenderer) {
      this.sheetMusicRenderer.destroy();
    }
  }
}
