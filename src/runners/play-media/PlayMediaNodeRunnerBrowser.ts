import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';
import { AudioService, VideoService } from '../../services/MediaService';

export class PlayMediaNodeRunnerBrowser implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context);
    
    const mediaType = params.mediaType || 'audio'; // audio, video
    let data = params.data; // Can be base64 string, array of base64 strings, URL, or MediaCapture object
    
    // Environment Check
    if (typeof window === 'undefined') {
        throw new Error("Play Media node only works in browser environment (Local Run)");
    }

    if (!data) {
        return { status: 'skipped', logs: ['No media data provided'] };
    }

    log(`Playing ${mediaType}...`);

    try {
        // Smart detection: If data is an object from MediaCapture
        let videoFrames: string[] | null = null;
        let audioData: string[] | null = null;
        let fps = Number(params.fps) || 2;

        if (!Array.isArray(data) && typeof data === 'object') {
            if (data.videoFrames) videoFrames = data.videoFrames;
            if (data.audioData) audioData = data.audioData;
            if (data.fps) fps = data.fps;
        } else if (mediaType === 'video' && Array.isArray(data)) {
            videoFrames = data;
        } else if (mediaType === 'audio') {
            audioData = Array.isArray(data) ? data : [data];
        }

        // Logic Branching
        if (videoFrames && videoFrames.length > 0) {
            // Video Mode (with optional Audio)
            const videoService = new VideoService();
            log(`Replaying ${videoFrames.length} video frames at ${fps} fps${audioData ? ' with audio' : ''}...`);
            
            // Pass audio data to video player for synchronized start
            await videoService.playVideoFrames(videoFrames, fps, audioData || undefined);

        } else if (audioData && audioData.length > 0) {
            // Audio Only Mode
            const audioService = new AudioService();
            
            for (let i = 0; i < audioData.length; i++) {
                const chunk = audioData[i];
                if (typeof chunk !== 'string') continue;
                
                if (chunk.startsWith('http')) {
                    log(`Playing audio from URL: ${chunk}`);
                    await new Promise((resolve, reject) => {
                        const audio = new Audio(chunk);
                        audio.onended = resolve;
                        audio.onerror = reject;
                        audio.play().catch(reject);
                    });
                } else {
                    // Assume Base64 PCM/WAV (16k from capture)
                    const duration = await audioService.playAudioBuffer(chunk, 16000);
                    log(`Playing audio chunk (${duration.toFixed(2)}s)...`);
                    await new Promise(resolve => setTimeout(resolve, duration * 1000));
                }
            }
            await audioService.cleanup();

        } else if (typeof data === 'string' && data.startsWith('http')) {
            // URL Fallback
            log(`Opening media URL: ${data}`);
            window.open(data, '_blank');
        } else {
            log("Unsupported media format or empty data.");
        }

        return {
            status: 'success',
            inputs: params,
            output: { played: true },
            logs: [`Finished playing media`]
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