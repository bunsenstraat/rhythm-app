// Results display component

import type { TestResults } from './types';

export class ResultsDisplay {
  private container: HTMLElement;
  private results: TestResults;
  private onRestart: () => void;
  private onBackToDesigner: () => void;

  constructor(
    container: HTMLElement, 
    results: TestResults, 
    onRestart: () => void,
    onBackToDesigner: () => void
  ) {
    this.container = container;
    this.results = results;
    this.onRestart = onRestart;
    this.onBackToDesigner = onBackToDesigner;
    this.render();
  }

  private render() {
    const avgAccuracy = Math.abs(this.results.accuracy);
    const accuracyRating = this.getAccuracyRating(avgAccuracy);
    
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
            <div class="stat-value">${accuracyRating}</div>
            <div class="stat-label">Rating</div>
          </div>
        </div>
        
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

  private getAccuracyRating(avgAccuracy: number): string {
    if (avgAccuracy < 50) return 'Perfect!';
    if (avgAccuracy < 100) return 'Great';
    if (avgAccuracy < 150) return 'Good';
    if (avgAccuracy < 200) return 'Fair';
    return 'Needs Work';
  }
}
