// Results display component

import type { TestResults, RhythmPattern, Note } from './types';
import { SheetMusicRenderer } from './SheetMusicRenderer';
import { getToleranceForNote, type ToleranceMode } from './toleranceConfig';

export class ResultsDisplay {
  private container: HTMLElement;
  private results: TestResults;
  private pattern: RhythmPattern | null;
  private onRestart: () => void;
  private onBackToDesigner: () => void;
  private sheetRenderer: SheetMusicRenderer | null = null;
  private toleranceMode: ToleranceMode;

  constructor(
    container: HTMLElement, 
    results: TestResults,
    pattern: RhythmPattern | null,
    onRestart: () => void,
    onBackToDesigner: () => void,
    toleranceMode: ToleranceMode = 'normal'
  ) {
    this.container = container;
    this.results = results;
    this.pattern = pattern;
    this.onRestart = onRestart;
    this.onBackToDesigner = onBackToDesigner;
    this.toleranceMode = toleranceMode;
    this.render();
  }

  private render() {
    const avgAccuracy = Math.abs(this.results.accuracy);
    const scoreRating = this.getScoreRating(this.results.score);
    
    // Pre-process: match taps to notes BEFORE rendering
    // This populates tap.noteIndex which is needed by renderTapList and renderTimingTable
    if (this.pattern) {
      this.sheetRenderer = new SheetMusicRenderer(document.createElement('div'), this.pattern, undefined, 4, this.toleranceMode);
      this.sheetRenderer.render();
      this.sheetRenderer.annotateWithResults(this.results);
    }
    
    this.container.innerHTML = `
      <div class="results-display">
        <div class="results-actions-top">
          <button id="try-again-button" class="primary-button">🔄 Try Again</button>
          <button id="back-designer-button" class="secondary-button">← Back to Designer</button>
        </div>
        
        <h2>Test Results</h2>
        
        <div class="score-card">
          <div class="score-main">
            <div class="score-value">${this.results.score}%</div>
            <div class="score-label">Score</div>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-value">${this.results.tappedNotes}</div>
            <div class="stat-label">Notes Hit</div>
          </div>
          
          <div class="stat">
            <div class="stat-value">${this.results.missedNotes}</div>
            <div class="stat-label">Notes Missed</div>
          </div>
          
          <div class="stat">
            <div class="stat-value">${avgAccuracy.toFixed(0)}ms</div>
            <div class="stat-label">Avg Timing</div>
          </div>
          
          <div class="stat">
            <div class="stat-value">${scoreRating}</div>
            <div class="stat-label">Rating</div>
          </div>
        </div>
        
        ${this.pattern ? `
          <div class="results-sheet-music">
            <h3>Your Performance</h3>
            <div class="legend">
              <span class="legend-item"><span class="legend-dot green"></span> Perfect timing</span>
              <span class="legend-item"><span class="legend-dot orange"></span> Timing off</span>
              <span class="legend-item"><span class="legend-dot red"></span> Missed</span>
            </div>
            <div id="results-sheet-container"></div>
          </div>
        ` : ''}
        
        <div class="timing-analytics">
          <h3>📊 Timing Analytics</h3>
          <details open>
            <summary style="cursor: pointer; font-weight: bold; margin-bottom: 1rem;">Raw Timing Data</summary>
            ${this.renderTimingTable()}
          </details>
        </div>
        

      </div>
    `;

    // Render annotated sheet music if pattern available
    if (this.pattern) {
      const sheetContainer = this.container.querySelector('#results-sheet-container') as HTMLElement;
      if (sheetContainer) {
        // Re-create the renderer for the actual container and re-render
        this.sheetRenderer = new SheetMusicRenderer(sheetContainer, this.pattern, undefined, 4, this.toleranceMode);
        this.sheetRenderer.render();
        // Re-annotate (taps already have noteIndex set from pre-processing)
        this.sheetRenderer.annotateWithResults(this.results);
      }
    }

    this.container.querySelector('#try-again-button')?.addEventListener('click', () => {
      this.onRestart();
    });
    
    this.container.querySelector('#back-designer-button')?.addEventListener('click', () => {
      this.onBackToDesigner();
    });
  }

  private getTapStatus(accuracy: number): string {
    if (accuracy < 50) return 'perfect';
    if (accuracy < 100) return 'good';
    if (accuracy < 150) return 'ok';
    return 'poor';
  }

  private renderTimingTable(): string {
    // Calculate duration-based tolerance for each note using the selected mode
    const beatDuration = 500; // ms per beat at 120 BPM
    const beatValues: Record<string, number> = {
      'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, 'q3': 2/3, '83': 1/3
    };
    
    const getNoteToleranceMs = (note: Note): number => {
      const beats = beatValues[note.duration] * (note.dotted ? 1.5 : 1);
      const noteDuration = beats * beatDuration;
      return getToleranceForNote(noteDuration, this.toleranceMode);
    };
    
    // Build complete picture: all expected notes and which were hit
    const rows: string[] = [];
    
    // Header
    rows.push(`
      <table class="timing-table">
        <thead>
          <tr>
            <th>Note #</th>
            <th>Expected Time</th>
            <th>Actual Time</th>
            <th>Difference</th>
            <th>Tolerance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `);
    
    // For each expected tap, show if it was hit and the timing
    this.results.expectedTaps.forEach((expectedTime, index) => {
      // Find if this note was hit
      const tap = this.results.taps.find(t => t.noteIndex === index);
      
      // Find the actual note in the pattern to get tolerance
      let expectedTapCount = 0;
      let foundNote: Note | null = null;
      
      if (this.pattern) {
        for (let i = 0; i < this.pattern.notes.length; i++) {
          const note = this.pattern.notes[i];
          const previousNote = i > 0 ? this.pattern.notes[i - 1] : null;
          const isTiedFromPrevious = previousNote && previousNote.tie;
          
          if (note.type === 'note' && !isTiedFromPrevious) {
            if (expectedTapCount === index) {
              foundNote = note;
              break;
            }
            expectedTapCount++;
          }
        }
      }
      
      const tolerance = foundNote ? getNoteToleranceMs(foundNote) : 100;
      
      if (tap) {
        const diff = tap.accuracy;
        const diffStr = diff === 0 ? '0ms' : 
                       diff < 0 ? `${Math.abs(diff).toFixed(0)}ms early` :
                       `${diff.toFixed(0)}ms late`;
        const status = this.getTapStatus(Math.abs(diff));
        
        rows.push(`
          <tr class="tap-hit ${status}">
            <td><strong>Note ${index + 1}</strong></td>
            <td>${expectedTime.toFixed(0)}ms</td>
            <td>${tap.timestamp.toFixed(0)}ms</td>
            <td>${diffStr}</td>
            <td><span class="tolerance-badge">±${tolerance.toFixed(0)}ms</span></td>
            <td><span class="status-badge ${status}">${status.toUpperCase()}</span></td>
          </tr>
        `);
      } else {
        // Missed note
        rows.push(`
          <tr class="tap-missed">
            <td><strong>Note ${index + 1}</strong></td>
            <td>${expectedTime.toFixed(0)}ms</td>
            <td>—</td>
            <td>—</td>
            <td><span class="tolerance-badge">±${tolerance.toFixed(0)}ms</span></td>
            <td><span class="status-badge missed">MISSED</span></td>
          </tr>
        `);
      }
    });
    
    rows.push(`
        </tbody>
      </table>
    `);
    
    // Calculate extra taps
    const matchedTaps = this.results.taps.filter(t => t.noteIndex !== undefined);
    const extraTaps = this.results.taps.length - matchedTaps.length;
    
    // Add summary stats
    rows.push(`
      <div class="analytics-summary">
        <h4>Summary</h4>
        <ul>
          <li><strong>Total Expected Notes:</strong> ${this.results.expectedTaps.length}</li>
          <li><strong>Notes Hit:</strong> ${this.results.tappedNotes}</li>
          <li><strong>Notes Missed:</strong> ${this.results.missedNotes}</li>
          <li><strong>Total Taps:</strong> ${this.results.taps.length}</li>
          ${extraTaps > 0 ? `<li style="color: #f59e0b;"><strong>⚠️ Extra Taps:</strong> ${extraTaps} (penalty applied)</li>` : ''}
          <li><strong>Average Timing Offset:</strong> ${Math.abs(this.results.accuracy).toFixed(1)}ms</li>
          <li><strong>Hit Rate:</strong> ${((this.results.tappedNotes / this.results.expectedTaps.length) * 100).toFixed(1)}%</li>
        </ul>
      </div>
    `);
    
    return rows.join('');
  }

  private getScoreRating(score: number): string {
    if (score >= 95) return 'Perfect!';
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Great';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Work';
  }
}
