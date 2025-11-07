// Core types for the rhythm trainer app

export type NoteDuration = 'w' | 'h' | 'h.' | 'q' | 'q.' | '8' | '16' | 'q3' | '83';
export type NoteType = 'note' | 'rest';

export interface Note {
  duration: NoteDuration;
  type: NoteType;
  tie?: boolean; // Whether this note is tied to the next note
  dotted?: boolean; // Whether this note is dotted (adds 50% duration)
}

export interface RhythmPattern {
  bars: number; // Number of bars (8-32)
  beatsPerBar: number; // Time signature (default 4)
  notes: Note[]; // Array of notes with durations
}

export interface TapEvent {
  timestamp: number; // When the tap occurred (in ms)
  expectedTime: number; // When it should have occurred (in ms)
  accuracy: number; // How accurate the tap was (in ms, negative = early, positive = late)
  noteIndex?: number; // Which note in the pattern this tap was matched to (for display)
}

export interface TestResults {
  totalNotes: number;
  tappedNotes: number;
  missedNotes: number;
  accuracy: number; // Average accuracy in ms
  score: number; // Percentage score (0-100)
  taps: TapEvent[];
  expectedTaps: number[]; // The actual expected times calculated by RhythmPlayer
}

export type AppState = 'design' | 'playing' | 'results';
