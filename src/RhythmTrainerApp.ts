// Main application controller

import type { RhythmPattern, TapEvent, TestResults } from './types';
import { AudioEngine } from './AudioEngine';
import { PatternDesigner } from './PatternDesigner';
import { RhythmPlayer } from './RhythmPlayer';
import { ResultsDisplay } from './ResultsDisplay';
import { Toast } from './Toast';

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
    // Load saved tempo from localStorage
    const savedTempo = localStorage.getItem('rhythmTrainerTempo');
    if (savedTempo) {
      this.tempo = parseInt(savedTempo);
    }
    
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
        <label class="tempo-label">Tempo: <span id="tempo-value">${this.tempo}</span> BPM</label>
        
        <div class="tempo-presets">
          <button class="tempo-preset-btn" data-tempo="40">Largo<br><small>40 BPM</small></button>
          <button class="tempo-preset-btn" data-tempo="60">Adagio<br><small>60 BPM</small></button>
          <button class="tempo-preset-btn" data-tempo="90">Andante<br><small>90 BPM</small></button>
          <button class="tempo-preset-btn" data-tempo="108">Moderato<br><small>108 BPM</small></button>
          <button class="tempo-preset-btn" data-tempo="132">Allegro<br><small>132 BPM</small></button>
          <button class="tempo-preset-btn" data-tempo="180">Presto<br><small>180 BPM</small></button>
        </div>
        
        <div class="tempo-slider-container">
          <input type="range" id="tempo" min="40" max="240" value="${this.tempo}" />
        </div>
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

    // Tempo slider control
    const tempoInput = document.getElementById('tempo') as HTMLInputElement;
    tempoInput.addEventListener('input', (e) => {
      this.setTempo(parseInt((e.target as HTMLInputElement).value));
    });

    // Tempo preset buttons
    const presetButtons = document.querySelectorAll('.tempo-preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tempo = parseInt((btn as HTMLElement).dataset.tempo || '120');
        this.setTempo(tempo);
        tempoInput.value = tempo.toString();
      });
    });
    
    // Highlight active preset
    this.updateActivePreset();

    // Start button
    document.getElementById('start-button')?.addEventListener('click', () => {
      if (this.pattern && this.pattern.notes.length > 0 && this.pattern.notes.some(n => n.type === 'note')) {
        this.startPractice();
      } else {
        Toast.error('Please design a rhythm pattern with at least one note!');
      }
    });
  }
  
  private setTempo(tempo: number) {
    this.tempo = tempo;
    localStorage.setItem('rhythmTrainerTempo', tempo.toString());
    document.getElementById('tempo-value')!.textContent = tempo.toString();
    this.updateActivePreset();
  }
  
  private updateActivePreset() {
    const presetButtons = document.querySelectorAll('.tempo-preset-btn');
    presetButtons.forEach(btn => {
      const btnTempo = parseInt((btn as HTMLElement).dataset.tempo || '0');
      if (btnTempo === this.tempo) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
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
    new ResultsDisplay(
      resultsContainer, 
      results, 
      () => this.startPractice(), // Try Again - restart practice
      () => this.showDesigner()   // Back to Designer
    );
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
