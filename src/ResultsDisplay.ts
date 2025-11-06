// Results display component

import type { TestResults, RhythmPattern } from './types';
import { SheetMusicRenderer } from './SheetMusicRenderer';

export class ResultsDisplay {
  private container: HTMLElement;
  private results: TestResults;
  private pattern: RhythmPattern | null;
  private onRestart: () => void;
  private onBackToDesigner: () => void;
  private sheetRenderer: SheetMusicRenderer | null = null;

  constructor(
    container: HTMLElement, 
    results: TestResults,
    pattern: RhythmPattern | null,
    onRestart: () => void,
    onBackToDesigner: () => void
  ) {
    this.container = container;
    this.results = results;
    this.pattern = pattern;
    this.onRestart = onRestart;
    this.onBackToDesigner = onBackToDesigner;
    this.render();
  }

  private render() {
    const avgAccuracy = Math.abs(this.results.accuracy);
    const scoreRating = this.getScoreRating(this.results.score);
    
    this.container.innerHTML = `
      <div class="results-display">
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
        
        <div class="tap-details">
          <h3>Tap Breakdown</h3>
          <div class="tap-list">
            ${this.renderTapList()}
          </div>
        </div>
        
        <div class="results-actions">
          <button id="try-again-button" class="primary-button">🔄 Try Again</button>
          <button id="back-designer-button" class="secondary-button">← Back to Designer</button>
        </div>
      </div>
    `;

    // Render annotated sheet music if pattern available
    if (this.pattern) {
      const sheetContainer = this.container.querySelector('#results-sheet-container') as HTMLElement;
      if (sheetContainer) {
        this.sheetRenderer = new SheetMusicRenderer(sheetContainer, this.pattern);
        this.sheetRenderer.render();
        // Annotate with test results
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

  private renderTapList(): string {
    if (this.results.taps.length === 0) {
      return '<div class="no-taps">No taps recorded</div>';
    }

    return this.results.taps
      .map((tap, index) => {
        const accuracy = Math.abs(tap.accuracy);
        const status = this.getTapStatus(accuracy);
        const timing = tap.accuracy < 0 ? 'early' : 'late';
        
        return `
          <div class="tap-item ${status}">
            <span class="tap-number">#${index + 1}</span>
            <span class="tap-timing">${accuracy.toFixed(0)}ms ${timing}</span>
            <span class="tap-status">${status}</span>
          </div>
        `;
      })
      .join('');
  }

  private getTapStatus(accuracy: number): string {
    if (accuracy < 50) return 'perfect';
    if (accuracy < 100) return 'good';
    if (accuracy < 150) return 'ok';
    return 'poor';
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
