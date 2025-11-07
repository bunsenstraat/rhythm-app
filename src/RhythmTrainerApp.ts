// Main application controller

import type { RhythmPattern, TapEvent, TestResults } from './types';
import { AudioEngine } from './AudioEngine';
import { PatternDesigner } from './PatternDesigner';
import { RhythmPlayer } from './RhythmPlayer';
import { ResultsDisplay } from './ResultsDisplay';
import { Toast } from './Toast';
import { ChallengeGenerator } from './ChallengeGenerator';
import { SheetMusicRenderer } from './SheetMusicRenderer';
import abcjs from 'abcjs';
import type { NoteDuration, NoteType } from './types';

export class RhythmTrainerApp {
  private container: HTMLElement;
  private audioEngine: AudioEngine;
  private pattern: RhythmPattern | null = null;
  private tempo: number = 120;
  private toleranceMode: 'relaxed' | 'normal' | 'strict' | 'pro' = 'normal';
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
    
    // Load saved tolerance mode
    const savedTolerance = localStorage.getItem('rhythmTrainerTolerance') as 'relaxed' | 'normal' | 'strict' | 'pro' | null;
    if (savedTolerance) {
      this.toleranceMode = savedTolerance;
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
        
        <nav class="app-nav">
          <button id="nav-designer" class="nav-btn active">📝 Designer</button>
          <button id="nav-challenge" class="nav-btn">🎯 Challenge</button>
          <button id="nav-library" class="nav-btn">📚 Library</button>
        </nav>
        
        <main class="app-main" id="app-main"></main>
      </div>
    `;

    // Navigation event listeners
    document.getElementById('nav-designer')?.addEventListener('click', () => {
      this.updateActiveNav('nav-designer');
      this.showDesigner();
    });
    
    document.getElementById('nav-challenge')?.addEventListener('click', () => {
      this.updateActiveNav('nav-challenge');
      this.showChallengeSelection();
    });
    
    document.getElementById('nav-library')?.addEventListener('click', () => {
      this.updateActiveNav('nav-library');
      this.showLibrary();
    });
  }

  private updateActiveNav(activeId: string) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(activeId)?.classList.add('active');
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
      
      <div class="tolerance-control">
        <label class="tolerance-label">Timing Difficulty</label>
        <p class="tolerance-description">How strict should the timing judgment be?</p>
        
        <div class="tolerance-presets">
          <button class="tolerance-preset-btn ${this.toleranceMode === 'relaxed' ? 'active' : ''}" data-tolerance="relaxed">
            😌 Relaxed<br><small>±100-300ms</small>
          </button>
          <button class="tolerance-preset-btn ${this.toleranceMode === 'normal' ? 'active' : ''}" data-tolerance="normal">
            👍 Normal<br><small>±50-200ms</small>
          </button>
          <button class="tolerance-preset-btn ${this.toleranceMode === 'strict' ? 'active' : ''}" data-tolerance="strict">
            😤 Strict<br><small>±30-120ms</small>
          </button>
          <button class="tolerance-preset-btn ${this.toleranceMode === 'pro' ? 'active' : ''}" data-tolerance="pro">
            🎯 Pro<br><small>±20-80ms</small>
          </button>
        </div>
      </div>
      
      <div class="action-buttons">
        <button id="start-button" class="primary-button">Start Practice</button>
        <button id="challenge-button" class="secondary-button">🎯 Challenge Mode</button>
      </div>
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
    
    // Tolerance preset buttons
    const toleranceButtons = document.querySelectorAll('.tolerance-preset-btn');
    toleranceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tolerance = (btn as HTMLElement).dataset.tolerance as 'relaxed' | 'normal' | 'strict' | 'pro';
        this.setTolerance(tolerance);
      });
    });
    
    // Highlight active presets
    this.updateActivePreset();
    this.updateActiveTolerance();

    // Start button
    document.getElementById('start-button')?.addEventListener('click', () => {
      if (this.pattern && this.pattern.notes.length > 0 && this.pattern.notes.some(n => n.type === 'note')) {
        this.startPractice();
      } else {
        Toast.error('Please design a rhythm pattern with at least one note!');
      }
    });
    
    // Challenge mode button
    document.getElementById('challenge-button')?.addEventListener('click', () => {
      this.showChallengeSelection();
    });
  }
  
  private setTempo(tempo: number) {
    this.tempo = tempo;
    localStorage.setItem('rhythmTrainerTempo', tempo.toString());
    document.getElementById('tempo-value')!.textContent = tempo.toString();
    this.updateActivePreset();
  }
  
  private setTolerance(tolerance: 'relaxed' | 'normal' | 'strict' | 'pro') {
    this.toleranceMode = tolerance;
    localStorage.setItem('rhythmTrainerTolerance', tolerance);
    this.updateActiveTolerance();
    Toast.info(`Timing difficulty set to: ${tolerance}`);
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
  
  private updateActiveTolerance() {
    const toleranceButtons = document.querySelectorAll('.tolerance-preset-btn');
    toleranceButtons.forEach(btn => {
      const btnTolerance = (btn as HTMLElement).dataset.tolerance;
      if (btnTolerance === this.toleranceMode) {
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
    // IMPORTANT: Must annotate taps with noteIndex BEFORE calculating score
    // The annotation process (in SheetMusicRenderer) populates tap.noteIndex
    if (this.pattern) {
      const tempDiv = document.createElement('div');
      const tempRenderer = new SheetMusicRenderer(tempDiv, this.pattern, undefined, 4, this.toleranceMode);
      tempRenderer.render();
      // This populates tap.noteIndex for all matched taps
      tempRenderer.annotateWithResults({ taps, expectedTaps, totalNotes: expectedTaps.length, tappedNotes: 0, missedNotes: 0, accuracy: 0, score: 0 });
    }
    
    // NOW calculate results with noteIndex populated
    const results = this.calculateResults(taps, expectedTaps);
    
    // Store results for display when returning to designer
    this.lastResults = results;
    
    const main = document.getElementById('app-main')!;
    main.innerHTML = '<div id="results-container"></div>';

    const resultsContainer = document.getElementById('results-container')!;
    new ResultsDisplay(
      resultsContainer, 
      results,
      this.pattern, // Pass the pattern for sheet music annotation
      () => this.startPractice(), // Try Again - restart practice
      () => this.showDesigner(),  // Back to Designer
      this.toleranceMode         // Pass tolerance mode
    );
  }

  private calculateResults(taps: TapEvent[], expectedTaps: number[]): TestResults {
    const totalNotes = expectedTaps.length;
    
    // Count only taps that were matched to notes (have noteIndex set)
    const matchedTaps = taps.filter(t => t.noteIndex !== undefined);
    const tappedNotes = matchedTaps.length;
    const missedNotes = totalNotes - tappedNotes;
    const extraTaps = taps.length - matchedTaps.length;
    
    // Calculate average accuracy (only for matched taps)
    let totalAccuracy = 0;
    for (const tap of matchedTaps) {
      totalAccuracy += Math.abs(tap.accuracy);
    }
    const avgAccuracy = matchedTaps.length > 0 ? totalAccuracy / matchedTaps.length : 0;
    
    // Calculate score (0-100)
    // Perfect score requires: all notes hit, good timing, no extra taps
    let score = 0;
    
    if (totalNotes > 0) {
      // Base score: hit ratio (70% weight)
      const hitRatio = tappedNotes / totalNotes;
      const hitScore = hitRatio * 70;
      
      // Timing score (20% weight): perfect timing = 20 points
      const timingScore = Math.max(0, 20 - avgAccuracy / 10);
      
      // Penalty for extra taps (10% weight): each extra tap reduces score
      const extraTapPenalty = Math.min(10, extraTaps * 2); // 2 points per extra tap, max 10 points
      
      score = Math.round(hitScore + timingScore - extraTapPenalty);
    }
    
    console.log(`[Scoring] Total notes: ${totalNotes}, Matched taps: ${tappedNotes}, Extra taps: ${extraTaps}, Score: ${score}`);
    
    return {
      totalNotes,
      tappedNotes,
      missedNotes,
      accuracy: avgAccuracy,
      score: Math.max(0, Math.min(100, score)),
      taps,
      expectedTaps, // Pass through the actual expected times
    };
  }
  
  private showChallengeSelection() {
    const main = document.getElementById('app-main')!;
    main.innerHTML = `
      <div class="challenge-selection">
        <h2>🎯 Challenge Mode</h2>
        <p class="challenge-description">Test your skills with randomly generated 8-bar patterns!</p>
        
        <div class="difficulty-grid">
          <div class="difficulty-card" data-difficulty="easy">
            <div class="difficulty-icon">🌱</div>
            <h3>Easy</h3>
            <p>Quarter and half notes<br>Simple rhythms</p>
            <button class="start-challenge-btn" data-difficulty="easy">Start Easy</button>
          </div>
          
          <div class="difficulty-card" data-difficulty="eighth-basic">
            <div class="difficulty-icon">�</div>
            <h3>Eighth Notes - Basic</h3>
            <p>Steady eighth notes<br>Occasional quarters</p>
            <button class="start-challenge-btn" data-difficulty="eighth-basic">Start</button>
          </div>
          
          <div class="difficulty-card" data-difficulty="eighth-syncopation">
            <div class="difficulty-icon">🎶</div>
            <h3>Eighth Notes - Syncopation</h3>
            <p>Off-beat patterns<br>Ties and syncopation</p>
            <button class="start-challenge-btn" data-difficulty="eighth-syncopation">Start</button>
          </div>
          
          <div class="difficulty-card" data-difficulty="eighth-rests">
            <div class="difficulty-icon">💫</div>
            <h3>Eighth Notes - Rests</h3>
            <p>Ties and rests<br>More challenging</p>
            <button class="start-challenge-btn" data-difficulty="eighth-rests">Start</button>
          </div>
          
          <div class="difficulty-card" data-difficulty="eighth-cross-bar">
            <div class="difficulty-icon">🌊</div>
            <h3>Eighth Notes - Cross-Bar</h3>
            <p>Ties across barlines<br>Longer rests (hard!)</p>
            <button class="start-challenge-btn" data-difficulty="eighth-cross-bar">Start</button>
          </div>
          
          <div class="difficulty-card" data-difficulty="medium">
            <div class="difficulty-icon">🎵</div>
            <h3>Medium</h3>
            <p>Mixed note values<br>Complex patterns</p>
            <button class="start-challenge-btn" data-difficulty="medium">Start Medium</button>
          </div>
          
          <div class="difficulty-card" data-difficulty="hard">
            <div class="difficulty-icon">🔥</div>
            <h3>Hard</h3>
            <p>Sixteenth notes and ties<br>Complex syncopation</p>
            <button class="start-challenge-btn" data-difficulty="hard">Start Hard</button>
          </div>
          
          <div class="difficulty-card" data-difficulty="expert">
            <div class="difficulty-icon">⚡</div>
            <h3>Expert</h3>
            <p>Triplets and dotted notes<br>Advanced rhythms</p>
            <button class="start-challenge-btn" data-difficulty="expert">Start Expert</button>
          </div>
        </div>
        
        <button id="back-to-designer-btn" class="secondary-button" style="margin-top: 2rem;">← Back to Designer</button>
      </div>
    `;
    
    // Add event listeners for challenge buttons
    document.querySelectorAll('.start-challenge-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const difficulty = (e.target as HTMLElement).dataset.difficulty as 'easy' | 'eighth-basic' | 'eighth-syncopation' | 'eighth-rests' | 'eighth-cross-bar' | 'medium' | 'hard' | 'expert';
        this.startChallenge(difficulty);
      });
    });
    
    document.getElementById('back-to-designer-btn')?.addEventListener('click', () => {
      this.updateActiveNav('nav-designer');
      this.showDesigner();
    });
  }
  
  private async showLibrary() {
    const main = document.getElementById('app-main')!;
    main.innerHTML = `
      <div class="pattern-library">
        <h2>📚 Pattern Library</h2>
        <p class="library-description">Load and practice from our collection of rhythm patterns</p>
        
        <div class="library-filters">
          <button class="filter-btn active" data-category="all">All</button>
          <button class="filter-btn" data-category="beginner">Beginner</button>
          <button class="filter-btn" data-category="intermediate">Intermediate</button>
          <button class="filter-btn" data-category="advanced">Advanced</button>
        </div>
        
        <div id="library-grid" class="library-grid">
          <div class="loading-message">Loading patterns...</div>
        </div>
      </div>
    `;

    // Load pattern index
    try {
      const response = await fetch('./patterns/index.json');
      const data = await response.json();
      const patterns = data.patterns || [];
      this.renderLibraryPatterns(patterns, 'all');

      // Filter event listeners
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const category = (e.target as HTMLElement).dataset.category || 'all';
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          (e.target as HTMLElement).classList.add('active');
          this.renderLibraryPatterns(patterns, category);
        });
      });
    } catch (error) {
      console.error('Failed to load pattern library:', error);
      document.getElementById('library-grid')!.innerHTML = 
        '<div class="error-message">Failed to load pattern library</div>';
    }
  }

  private renderLibraryPatterns(patterns: any[], category: string) {
    const filteredPatterns = category === 'all' 
      ? patterns 
      : patterns.filter(p => p.category === category);

    const grid = document.getElementById('library-grid')!;
    
    if (filteredPatterns.length === 0) {
      grid.innerHTML = '<div class="empty-message">No patterns found in this category</div>';
      return;
    }

    grid.innerHTML = filteredPatterns.map((p, index) => `
      <div class="library-pattern-card" data-index="${index}" data-file="${p.filename}">
        <div class="pattern-category ${p.category}">${p.category}</div>
        <h3>${p.name || 'Untitled'}</h3>
        <p>${p.bars || 4} bars • ${p.timeSignature || '4/4'}</p>
        <button class="load-pattern-btn" data-file="${p.filename}">Load Pattern</button>
      </div>
    `).join('');

    // Add event listeners for load buttons
    document.querySelectorAll('.load-pattern-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const file = (e.target as HTMLElement).dataset.file;
        await this.loadPatternFromLibrary(file!);
      });
    });
  }

  private async loadPatternFromLibrary(file: string) {
    try {
      const response = await fetch(`./patterns/${file}`);
      
      if (file.endsWith('.abc')) {
        // ABC files need to be parsed
        const abcText = await response.text();
        const pattern = this.parseABCFile(abcText);
        if (pattern) {
          this.pattern = pattern;
          Toast.success(`Loaded ABC pattern from ${file}`, 2000);
          this.updateActiveNav('nav-designer');
          this.showDesigner();
        }
        return;
      }
      
      const data = await response.json();
      // Handle nested structure: some JSONs have pattern.pattern, others are just pattern
      this.pattern = data.pattern || data;
      Toast.success(`Loaded: ${data.name || data.title || 'Pattern'}`, 2000);
      this.updateActiveNav('nav-designer');
      this.showDesigner();
    } catch (error) {
      console.error('Failed to load pattern:', error);
      Toast.error('Failed to load pattern', 2000);
    }
  }

  private parseABCFile(abc: string): RhythmPattern | null {
    const notes: Array<{ duration: NoteDuration; type: NoteType; dotted?: boolean; tie?: boolean }> = [];
    
    try {
      // Use abcjs's built-in parser
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
              for (const element of voice) {
                // Skip bar lines and other non-note elements
                if (element.el_type === 'bar') continue;
                
                // Handle notes and rests
                if (element.el_type === 'note') {
                  // Check if it's a rest
                  const isRest = element.rest;
                  
                  // Get duration - abcjs uses duration as a fraction of a whole note
                  const abcDuration = element.duration || 0.25;
                  let duration: NoteDuration = 'q';
                  let dotted = false;
                  
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
                  
                  // Check for ties
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
      
      // Create pattern from parsed notes
      return {
        bars: barCount > 0 ? barCount : 4,
        beatsPerBar: 4, // Default to 4/4
        notes: notes
      };
      
    } catch (error) {
      console.error('Error parsing ABC:', error);
      Toast.error('Failed to parse ABC notation. Please check the format.');
      return null;
    }
  }
  
  private startChallenge(difficulty: 'easy' | 'eighth-basic' | 'eighth-syncopation' | 'eighth-rests' | 'eighth-cross-bar' | 'medium' | 'hard' | 'expert') {
    const challenge = ChallengeGenerator.generateChallenge(difficulty);
    this.pattern = challenge.pattern;
    
    Toast.success(`${challenge.title}: ${challenge.description}`, 4000);
    this.startPractice();
  }
}
