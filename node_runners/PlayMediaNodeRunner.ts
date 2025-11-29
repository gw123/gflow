
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';
import { AudioService, VideoService } from '../services/MediaService';

export class PlayMediaNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context);
    
    const mediaType = params.mediaType || 'audio'; // audio, video
    const data = params.data; // Can be base64 string, array of base64 strings, or URL
    
    // Environment Check
    if (typeof window === 'undefined') {
        throw new Error("Play Media node only works in browser environment (Local Run)");
    }

    if (!data) {
        return { status: 'skipped', logs: ['No media data provided'] };
    }

    log(`Playing ${mediaType}...`);

    try {
        if (mediaType === 'audio') {
            const audioService = new AudioService();
            const chunks = Array.isArray(data) ? data : [data];
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (typeof chunk !== 'string') continue;
                
                // Check if it's a URL or Base64
                // AudioService.playAudioBuffer expects Base64
                // If URL, use HTML5 Audio
                if (chunk.startsWith('http')) {
                    log(`Playing audio from URL: ${chunk}`);
                    await new Promise((resolve, reject) => {
                        const audio = new Audio(chunk);
                        audio.onended = resolve;
                        audio.onerror = reject;
                        audio.play().catch(reject);
                    });
                } else {
                    // Assume Base64 PCM/WAV
                    // Pass 16000 explicitly as our Capture node downsamples to 16k
                    const duration = await audioService.playAudioBuffer(chunk, 16000);
                    log(`Playing audio chunk (${duration.toFixed(2)}s)...`);
                    
                    // CRITICAL: Wait for playback to complete before moving on or cleaning up
                    await new Promise(resolve => setTimeout(resolve, duration * 1000));
                }
            }
            await audioService.cleanup();
        } else if (mediaType === 'video') {
            const videoService = new VideoService();
            if (Array.isArray(data)) {
                // Assume Frames
                const fps = Number(params.fps) || 2;
                log(`Replaying ${data.length} video frames at ${fps} fps...`);
                await videoService.playVideoFrames(data, fps);
            } else if (typeof data === 'string' && data.startsWith('http')) {
                // URL Video
                log(`Opening video URL in new tab (Auto-play in workflow not fully supported for URLs yet): ${data}`);
                window.open(data, '_blank');
            } else {
                log("Unsupported video data format. Provide an array of base64 frames or a URL.");
            }
        }

        return {
            status: 'success',
            inputs: params,
            output: { played: true },
            logs: [`Finished playing ${mediaType}`]
        };

    } catch (e: any) {
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs: [`Play failed: ${e.message}`]
        };
    }
  }
}
