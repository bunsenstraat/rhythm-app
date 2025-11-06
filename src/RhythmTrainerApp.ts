// Main application controller

import type { RhythmPattern, TapEvent, TestResults } from './types';
import { AudioEngine } from './AudioEngine';
import { PatternDesigner } from './PatternDesigner';
import { RhythmPlayer } from './RhythmPlayer';
import { ResultsDisplay } from './ResultsDisplay';

export class RhythmTrainerApp {
  private container: HTMLElement;
  private audioEngine: AudioEngine;
  private pattern: RhythmPattern | null = null;
  private tempo: number = 120;
  private currentPlayer: RhythmPlayer | null = null;
  private lastResults: TestResults | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.audioEngine = new AudioEngine();
    this.init();
  }

  private init() {
    this.renderLayout();
    this.showDesigner();
  }

  private renderLayout() {
    this.container.innerHTML = `
      <div class="rhythm-trainer-app">
        <header class="app-header">
          <h1>🎵 Rhythm Trainer</h1>
          <p class="app-subtitle">Design, Practice, and Perfect Your Rhythm</p>
        </header>
        
        <main class="app-main" id="app-main"></main>
      </div>
    `;
  }

  private showDesigner() {
    const main = document.getElementById('app-main')!;
    main.innerHTML = `
      <div id="designer-container"></div>
      
      <div class="tempo-control">
        <label for="tempo">Tempo: <span id="tempo-value">${this.tempo}</span> BPM</label>
        <input type="range" id="tempo" min="40" max="240" value="${this.tempo}" />
      </div>
      
      <button id="start-button" class="primary-button">Start Practice</button>
    `;

    const designerContainer = document.getElementById('designer-container')!;
    new PatternDesigner(
      designerContainer, 
      (pattern: RhythmPattern) => {
        this.pattern = pattern;
      }, 
      this.lastResults,
      this.pattern
    );

    // Tempo control
    const tempoInput = document.getElementById('tempo') as HTMLInputElement;
    tempoInput.addEventListener('input', (e) => {
      this.tempo = parseInt((e.target as HTMLInputElement).value);
      document.getElementById('tempo-value')!.textContent = this.tempo.toString();
    });

    // Start button
    document.getElementById('start-button')?.addEventListener('click', () => {
      if (this.pattern && this.pattern.notes.length > 0 && this.pattern.notes.some(n => n.type === 'note')) {
        this.startPractice();
      } else {
        alert('Please design a rhythm pattern with at least one note!');
      }
    });
  }

  private startPractice() {
    if (!this.pattern) return;

    const main = document.getElementById('app-main')!;
    main.innerHTML = '<div id="player-container"></div>';

    const playerContainer = document.getElementById('player-container')!;
    this.currentPlayer = new RhythmPlayer(
      playerContainer,
      this.pattern,
      this.tempo,
      this.audioEngine,
      (taps: TapEvent[], expectedTaps: number[]) => this.showResults(taps, expectedTaps)
    );

    this.currentPlayer.start();
  }

  private showResults(taps: TapEvent[], expectedTaps: number[]) {
    // Calculate results
    const results = this.calculateResults(taps, expectedTaps);
    
    // Store results for display when returning to designer
    this.lastResults = results;
    
    const main = document.getElementById('app-main')!;
    main.innerHTML = '<div id="results-container"></div>';

    const resultsContainer = document.getElementById('results-container')!;
    new ResultsDisplay(resultsContainer, results, () => this.showDesigner());
  }

  private calculateResults(taps: TapEvent[], expectedTaps: number[]): TestResults {
    const totalNotes = expectedTaps.length;
    const tappedNotes = taps.length;
    const missedNotes = Math.max(0, totalNotes - tappedNotes);
    
    // Calculate average accuracy
    let totalAccuracy = 0;
    for (const tap of taps) {
      totalAccuracy += Math.abs(tap.accuracy);
    }
    const avgAccuracy = taps.length > 0 ? totalAccuracy / taps.length : 0;
    
    // Calculate score (0-100)
    // Perfect score if all notes hit with perfect timing
    // Reduce score based on missed notes and timing accuracy
    let score = 0;
    
    if (totalNotes > 0) {
      const hitRatio = tappedNotes / totalNotes;
      const timingScore = Math.max(0, 100 - avgAccuracy / 2); // Max 200ms = 0 points
      score = Math.round(hitRatio * timingScore);
    }
    
    return {
      totalNotes,
      tappedNotes,
      missedNotes,
      accuracy: avgAccuracy,
      score: Math.max(0, Math.min(100, score)),
      taps
    };
  }
}
