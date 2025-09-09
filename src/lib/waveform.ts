
// This utility uses the Web Audio API to decode audio data and extract
// peak amplitude information to draw a waveform.

// It is not supported on Node.js environments.
let audioContext: AudioContext | null = null;

export type WaveformData = {
  left: number[];
  right: number[];
};

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
 * Extracts peak data from a single audio channel.
 * @param channelData The Float32Array for the channel.
 * @param targetPoints The number of data points to generate.
 * @returns An array of numbers representing the waveform for that channel.
 */
function getPeaks(channelData: Float32Array, targetPoints: number): number[] {
    const peaks: number[] = [];
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
}


/**
 * Generates waveform data from an audio buffer at a fixed high resolution.
 * @param audioBuffer The ArrayBuffer of the audio file.
 * @returns A promise that resolves to an object with left and right channel waveform data.
 */
export async function generateWaveformData(
  audioBuffer: ArrayBuffer
): Promise<WaveformData> {
  const highResPoints = 4000; // Always calculate a high number of points
  
  const context = getAudioContext();
  if (!context) {
    console.error("AudioContext is not supported in this environment.");
    const flatLine = new Array(highResPoints).fill(0.1);
    return { left: flatLine, right: flatLine };
  }

  try {
    const decodedBuffer = await context.decodeAudioData(audioBuffer);
    
    const leftChannelData = decodedBuffer.getChannelData(0);
    const leftPeaks = getPeaks(leftChannelData, highResPoints);
    
    let rightPeaks: number[];
    if (decodedBuffer.numberOfChannels > 1) {
        const rightChannelData = decodedBuffer.getChannelData(1);
        rightPeaks = getPeaks(rightChannelData, highResPoints);
    } else {
        // For mono, just duplicate the left channel
        rightPeaks = [...leftPeaks];
    }
    
    return { left: leftPeaks, right: rightPeaks };
  } catch (error) {
    console.error("Failed to generate waveform data:", error);
    // Return a flat line on error
    const flatLine = new Array(highResPoints).fill(0.1);
    return { left: flatLine, right: flatLine };
  }
}
