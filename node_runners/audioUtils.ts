
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 16000
): Promise<AudioBuffer> {
  try {
    // Try decoding as standard container format (wav, mp3, ogg)
    // We clone the buffer because decodeAudioData detaches it
    return await ctx.decodeAudioData(data.buffer.slice(0) as ArrayBuffer);
  } catch (e) {
    // Fallback: Assume raw 16-bit PCM (Little Endian)
    // This is typically what our MediaCapture node produces via pcmToGeminiBlob
    const numChannels = 1; 
    
    let bufferToUse = data.buffer;
    
    // Safety check: Int16Array requires byteLength to be multiple of 2
    if (data.byteLength % 2 !== 0) {
        const newBuffer = new Uint8Array(data.byteLength + 1);
        newBuffer.set(data);
        bufferToUse = newBuffer.buffer;
    }

    const dataInt16 = new Int16Array(bufferToUse);
    const frameCount = dataInt16.length / numChannels;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Convert Int16 to Float32 [-1.0, 1.0]
            // We assume interleaved if numChannels > 1, but here typically mono
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
  }
}

// Convert Float32 PCM to 16-bit PCM (standard for many APIs)
export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

export function downsampleTo16000(inputData: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return inputData;
  
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputData.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    // Simple decimation/nearest neighbor for performance in JS
    const offset = Math.floor(i * ratio);
    if (offset < inputData.length) {
        result[i] = inputData[offset];
    }
  }
  
  return result;
}

export function pcmToGeminiBlob(pcmData: Float32Array): string {
    const pcm16 = floatTo16BitPCM(pcmData);
    const bytes = new Uint8Array(pcm16.buffer);
    return arrayBufferToBase64(bytes.buffer as ArrayBuffer);
}
