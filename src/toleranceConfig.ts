// Tolerance configuration for timing accuracy

export type ToleranceMode = 'relaxed' | 'normal' | 'strict' | 'pro';

export interface ToleranceConfig {
  min: number; // Minimum tolerance in ms
  max: number; // Maximum tolerance in ms
  percentage: number; // Percentage of note duration to use for tolerance
}

export const TOLERANCE_PRESETS: Record<ToleranceMode, ToleranceConfig> = {
  relaxed: {
    min: 100,
    max: 300,
    percentage: 0.5  // 50% of note duration
  },
  normal: {
    min: 50,
    max: 200,
    percentage: 0.3  // 30% of note duration
  },
  strict: {
    min: 30,
    max: 120,
    percentage: 0.2  // 20% of note duration
  },
  pro: {
    min: 20,
    max: 80,
    percentage: 0.15  // 15% of note duration
  }
};

export function getToleranceForNote(noteDurationMs: number, mode: ToleranceMode = 'normal'): number {
  const config = TOLERANCE_PRESETS[mode];
  const calculatedTolerance = noteDurationMs * config.percentage;
  return Math.max(config.min, Math.min(config.max, calculatedTolerance));
}
