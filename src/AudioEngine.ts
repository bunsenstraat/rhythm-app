// Audio engine using Web Audio API for precise timing

export class AudioEngine {
  private audioContext: AudioContext;
  private metronomeBuffer: AudioBuffer | null = null;
  private patternBuffer: AudioBuffer | null = null;
  private tapBuffer: AudioBuffer | null = null;

  constructor() {
    this.audioContext = new AudioContext();
    this.createSounds();
  }

  private async createSounds() {
    // Create metronome click (higher pitched, sharper)
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.03; // 30ms click
    const length = sampleRate * duration;
    const metBuffer = this.audioContext.createBuffer(1, length, sampleRate);
    const metData = metBuffer.getChannelData(0);

    // Metronome: sharp click at 1200Hz
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      metData[i] = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 80);
    }
    this.metronomeBuffer = metBuffer;

    // Create pattern sound (lower pitched, softer)
    const patBuffer = this.audioContext.createBuffer(1, length, sampleRate);
    const patData = patBuffer.getChannelData(0);

    // Pattern: softer tone at 600Hz
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      patData[i] = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 40);
    }
    this.patternBuffer = patBuffer;

    // Create tap feedback sound (distinctive snappy sound)
    const tapBuffer = this.audioContext.createBuffer(1, length, sampleRate);
    const tapData = tapBuffer.getChannelData(0);

    // Tap: bright percussive sound at 800Hz with quick decay
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      tapData[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 100);
    }
    this.tapBuffer = tapBuffer;
  }

  playMetronome(time?: number, isDownbeat: boolean = false) {
    if (!this.metronomeBuffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = this.metronomeBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Louder for downbeat
    gainNode.gain.value = isDownbeat ? 0.5 : 0.3;
    // Higher pitch for downbeat
    source.playbackRate.value = isDownbeat ? 1.2 : 1.0;

    const startTime = time ?? this.audioContext.currentTime;
    source.start(startTime);
  }

  playPattern(time?: number) {
    if (!this.patternBuffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = this.patternBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    gainNode.gain.value = 0.4;

    const startTime = time ?? this.audioContext.currentTime;
    source.start(startTime);
  }

  playTap(time?: number) {
    if (!this.tapBuffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = this.tapBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    gainNode.gain.value = 0.5;

    const startTime = time ?? this.audioContext.currentTime;
    source.start(startTime);
  }

  playClick(time?: number, frequency: number = 1000) {
    // Backwards compatibility - use metronome sound
    this.playMetronome(time, frequency > 1000);
  }

  getCurrentTime(): number {
    return this.audioContext.currentTime * 1000; // Convert to ms
  }

  getContextTime(): number {
    return this.audioContext.currentTime; // Raw context time in seconds
  }

  async resume() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}
