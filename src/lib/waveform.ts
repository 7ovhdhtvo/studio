
// This utility uses the Web Audio API to decode audio data and extract
// peak amplitude information to draw a waveform.

// It is not supported on Node.js environments.
let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window !== 'undefined') {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
  }
  return null;
}

/**
 * Normalizes the peak values to a range of 0 to 1.
 * @param peaks The array of peak values.
 * @returns The normalized array of peak values.
 */
function normalize(peaks: number[]): number[] {
  const max = Math.max(...peaks);
  if (max === 0) return peaks;
  return peaks.map(p => p / max);
}

/**
 * Generates waveform data from an audio buffer.
 * @param audioBuffer The ArrayBuffer of the audio file.
 * @param targetPoints The number of data points to generate for the waveform.
 * @returns A promise that resolves to an array of numbers representing the waveform.
 */
export async function generateWaveformData(
  audioBuffer: ArrayBuffer,
  targetPoints = 150
): Promise<number[]> {
  const context = getAudioContext();
  if (!context) {
    console.error("AudioContext is not supported in this environment.");
    return new Array(targetPoints).fill(0.1);
  }

  try {
    const decodedBuffer = await context.decodeAudioData(audioBuffer);
    const channelData = decodedBuffer.getChannelData(0); // Use the first channel
    const peaks: number[] = [];
    
    const sampleRate = decodedBuffer.sampleRate;
    const totalSamples = channelData.length;
    const samplesPerPoint = Math.floor(totalSamples / targetPoints);

    for (let i = 0; i < targetPoints; i++) {
      const start = i * samplesPerPoint;
      const end = start + samplesPerPoint;
      let maxPeak = 0;
      for (let j = start; j < end; j++) {
        const peak = Math.abs(channelData[j] || 0);
        if (peak > maxPeak) {
          maxPeak = peak;
        }
      }
      peaks.push(maxPeak);
    }
    
    return normalize(peaks);
  } catch (error) {
    console.error("Failed to generate waveform data:", error);
    // Return a flat line on error
    return new Array(targetPoints).fill(0.1);
  }
}
