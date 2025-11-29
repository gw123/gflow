
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';
import { AudioService, VideoService } from '../services/MediaService';
import { pcmToGeminiBlob } from './audioUtils';

export class MediaNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context);
    
    const mode = params.mode || 'audio'; // audio, video, both
    const duration = Number(params.duration) || 5;
    const fps = Number(params.fps) || 1;

    // Check environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error("Media Capture only works in browser environment (Local Run)");
    }

    log(`Starting ${mode} capture for ${duration} seconds...`);

    const audioService = new AudioService();
    const videoService = new VideoService();
    
    const audioChunks: string[] = []; // Base64 PCM
    const videoFrames: string[] = []; // Base64 JPEG

    try {
        const promises = [];

        // Start Audio
        if (mode === 'audio' || mode === 'both') {
            promises.push(audioService.startCapture((data) => {
                // Convert raw float32 chunk to base64 PCM immediately to store
                // In a real app you might stream this or buffer it differently
                audioChunks.push(pcmToGeminiBlob(data));
            }));
        }

        // Start Video
        if (mode === 'video' || mode === 'both') {
            videoService.setFrameRate(fps);
            promises.push(videoService.startCapture((base64) => {
                videoFrames.push(base64);
                // log(`Captured frame: ${videoFrames.length}`);
            }));
        }

        await Promise.all(promises);
        
        // Wait for duration
        // We use a countdown log to keep user informed
        for (let i = 0; i < duration; i++) {
            log(`Recording... ${duration - i}s remaining`);
            await new Promise(r => setTimeout(r, 1000));
        }

        // Stop Capture
        await audioService.cleanup();
        videoService.stopCamera();

        log(`Capture finished. Audio chunks: ${audioChunks.length}, Video frames: ${videoFrames.length}`);

        return {
            status: 'success',
            inputs: params,
            output: {
                mode,
                duration,
                audioData: audioChunks, // Array of base64 chunks
                videoFrames: videoFrames, // Array of base64 images
                timestamp: new Date().toISOString()
            },
            logs: [`Captured ${audioChunks.length} audio chunks and ${videoFrames.length} frames`]
        };

    } catch (e: any) {
        // Cleanup on error
        await audioService.cleanup();
        videoService.stopCamera();
        
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs: [`Capture failed: ${e.message}`]
        };
    }
  }
}
