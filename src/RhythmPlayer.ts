// Rhythm player that plays the pattern and detects taps

import type { RhythmPattern, TapEvent } from './types';
import { AudioEngine } from './AudioEngine';
import { SheetMusicRenderer } from './SheetMusicRenderer';

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
    await this.audioEngine.resume();
    this.isPlaying = true;
    this.taps = [];
    this.currentNoteIndex = 0;
    
    // Calculate note times and expected taps
    this.calculateNoteTimes();
    
    this.render();
    this.startPlayback();
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
    
    this.pattern.notes.forEach((note) => {
      this.noteTimes.push(currentTime);
      
      // Add to expected taps if it's a note (not a rest)
      if (note.type === 'note') {
        this.expectedTaps.push(currentTime);
      }
      
      // Move forward by the note's duration
      const noteBeats = beatValues[note.duration];
      currentTime += noteBeats * beatDuration;
    });
  }

  private render() {
    const totalNotes = this.pattern.notes.filter(n => n.type === 'note').length;
    
    this.container.innerHTML = `
      <div class="rhythm-player">
        <h2 id="player-title">Get Ready...</h2>
        
        <div class="sheet-music-container" id="sheet-music-player"></div>
        
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        
        <div class="current-note" id="current-note">
          Note: <span id="note-number">0</span> / ${this.pattern.notes.length}
        </div>
        
        <div class="tap-button-container">
          <button id="tap-button" class="tap-button">
            TAP
          </button>
        </div>
        
        <div class="tap-counter">
          Taps: <span id="tap-count">0</span> / ${totalNotes}
        </div>
      </div>
    `;

    const tapButton = this.container.querySelector('#tap-button') as HTMLButtonElement;
    tapButton.addEventListener('click', () => this.handleTap());
    
    // Also allow spacebar for tapping
    document.addEventListener('keydown', this.handleKeyPress);
    
    // Render sheet music
    const sheetMusicContainer = document.getElementById('sheet-music-player');
    if (sheetMusicContainer) {
      this.sheetMusicRenderer = new SheetMusicRenderer(sheetMusicContainer, this.pattern);
      this.sheetMusicRenderer.render();
    }
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
    const totalDuration = this.noteTimes[this.noteTimes.length - 1] || beatDuration * 4;
    
    // Small delay to ensure everything is ready
    const startDelay = 0.1; // 100ms
    
    // Synchronize audio and visual timers
    const audioContextStartTime = this.audioEngine.getContextTime() + startDelay;
    this.startTime = Date.now() + (startDelay * 1000);
    
    // Schedule count-in metronome clicks
    for (let i = 0; i < countInBeats; i++) {
      const beatTime = audioContextStartTime + (i * beatDuration / 1000);
      const isDownbeat = i === 0;
      const frequency = isDownbeat ? 1400 : 1000;
      this.audioEngine.playClick(beatTime, frequency);
    }
    
    // Schedule pattern metronome clicks based on actual note times
    this.pattern.notes.forEach((note, index) => {
      if (note.type === 'note') {
        const noteTime = this.noteTimes[index];
        const beatTime = audioContextStartTime + ((countInDuration + noteTime) / 1000);
        
        // Determine if it's a downbeat (first note of each bar)
        const totalBeatsElapsed = noteTime / beatDuration;
        const isDownbeat = Math.abs(totalBeatsElapsed % this.pattern.beatsPerBar) < 0.01;
        const frequency = isDownbeat ? 1200 : 800;
        
        this.audioEngine.playClick(beatTime, frequency);
      }
    });
    
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
          playerTitle.textContent = `Count In: ${countBeat}`;
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
    
    const beatDuration = (60 / this.tempo) * 1000;
    const countInDuration = this.pattern.beatsPerBar * beatDuration;
    const tapTime = Date.now() - this.startTime;
    
    // Ignore taps during count-in
    if (tapTime < countInDuration) {
      return;
    }
    
    // Adjust tap time to be relative to pattern start (after count-in)
    const patternTapTime = tapTime - countInDuration;
    
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
