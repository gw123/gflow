import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * MediaNodeRunnerServer - Node.js implementation for media capture
 * 
 * Uses FFmpeg to capture audio/video from local devices.
 * Requires FFmpeg to be installed on the system.
 * 
 * On macOS: Uses avfoundation for device capture
 * On Linux: Uses v4l2 for video and alsa/pulse for audio
 * On Windows: Uses dshow for device capture
 */
export class MediaNodeRunnerServer implements NodeRunner {

  private getDeviceInput(): { video: string; audio: string; format: string } {
    const platform = os.platform();

    switch (platform) {
      case 'darwin': // macOS
        return {
          format: 'avfoundation',
          video: '0', // Default camera
          audio: '0', // Default microphone (use ':0' for audio only)
        };
      case 'linux':
        return {
          format: 'v4l2',
          video: '/dev/video0',
          audio: 'default', // ALSA device
        };
      case 'win32':
        return {
          format: 'dshow',
          video: 'video=Integrated Camera', // Common name, may vary
          audio: 'audio=Microphone',
        };
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async checkFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', ['-version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  private async listDevices(log: (msg: string) => void): Promise<void> {
    const platform = os.platform();

    if (platform === 'darwin') {
      return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
        let output = '';

        proc.stderr.on('data', (data) => {
          output += data.toString();
        });

        proc.on('close', () => {
          log('Available devices:\n' + output.split('\n')
            .filter(line => line.includes('[AVFoundation'))
            .join('\n'));
          resolve();
        });
      });
    }
  }

  private async captureAudio(
    duration: number,
    tempDir: string,
    log: (msg: string) => void
  ): Promise<string[]> {
    const device = this.getDeviceInput();
    const outputFile = path.join(tempDir, 'audio.raw');
    const platform = os.platform();

    const args: string[] = [];

    if (platform === 'darwin') {
      args.push(
        '-f', device.format,
        '-i', `:${device.audio}`, // Audio only on macOS
        '-t', duration.toString(),
        '-ar', '16000',           // 16kHz sample rate (matches browser impl)
        '-ac', '1',               // Mono
        '-f', 's16le',            // 16-bit signed little-endian PCM
        '-y',                     // Overwrite output
        outputFile
      );
    } else if (platform === 'linux') {
      args.push(
        '-f', 'alsa',
        '-i', device.audio,
        '-t', duration.toString(),
        '-ar', '16000',
        '-ac', '1',
        '-f', 's16le',
        '-y',
        outputFile
      );
    } else if (platform === 'win32') {
      args.push(
        '-f', device.format,
        '-i', device.audio,
        '-t', duration.toString(),
        '-ar', '16000',
        '-ac', '1',
        '-f', 's16le',
        '-y',
        outputFile
      );
    }

    log(`Starting audio capture for ${duration} seconds...`);

    await this.runFFmpeg(args, log);

    // Read the raw PCM file and convert to base64 chunks
    if (!fs.existsSync(outputFile)) {
      throw new Error('Audio capture failed - no output file created');
    }

    const audioBuffer = fs.readFileSync(outputFile);
    const chunks = this.splitAudioBuffer(audioBuffer);

    // Cleanup temp file
    fs.unlinkSync(outputFile);

    return chunks;
  }

  private async captureVideo(
    duration: number,
    fps: number,
    tempDir: string,
    log: (msg: string) => void
  ): Promise<string[]> {
    const device = this.getDeviceInput();
    const platform = os.platform();
    const outputPattern = path.join(tempDir, 'frame_%04d.jpg');

    const args: string[] = [];

    if (platform === 'darwin') {
      args.push(
        '-f', device.format,
        '-framerate', fps.toString(),
        '-video_size', '320x240',
        '-i', `${device.video}:none`, // Video only (no audio)
        '-t', duration.toString(),
        '-vf', `fps=${fps}`,
        '-q:v', '5', // JPEG quality (lower = better, 2-31)
        '-y',
        outputPattern
      );
    } else if (platform === 'linux') {
      args.push(
        '-f', device.format,
        '-framerate', fps.toString(),
        '-video_size', '320x240',
        '-i', device.video,
        '-t', duration.toString(),
        '-vf', `fps=${fps}`,
        '-q:v', '5',
        '-y',
        outputPattern
      );
    } else if (platform === 'win32') {
      args.push(
        '-f', device.format,
        '-video_size', '320x240',
        '-i', device.video,
        '-t', duration.toString(),
        '-vf', `fps=${fps}`,
        '-q:v', '5',
        '-y',
        outputPattern
      );
    }

    log(`Starting video capture for ${duration} seconds at ${fps} fps...`);

    await this.runFFmpeg(args, log);

    // Read all frame files and convert to base64
    const frames: string[] = [];
    let frameNum = 1;

    while (true) {
      const framePath = path.join(tempDir, `frame_${String(frameNum).padStart(4, '0')}.jpg`);
      if (!fs.existsSync(framePath)) break;

      const frameBuffer = fs.readFileSync(framePath);
      frames.push(frameBuffer.toString('base64'));

      // Cleanup frame file
      fs.unlinkSync(framePath);
      frameNum++;
    }

    return frames;
  }

  private async captureBoth(
    duration: number,
    fps: number,
    tempDir: string,
    log: (msg: string) => void
  ): Promise<{ audioChunks: string[], videoFrames: string[] }> {
    const device = this.getDeviceInput();
    const platform = os.platform();
    const audioFile = path.join(tempDir, 'audio.raw');
    const videoPattern = path.join(tempDir, 'frame_%04d.jpg');

    const args: string[] = [];

    if (platform === 'darwin') {
      args.push(
        '-f', device.format,
        '-framerate', fps.toString(),
        '-video_size', '320x240',
        '-i', `${device.video}:${device.audio}`, // Both video and audio
        '-t', duration.toString(),
        // Video output
        '-map', '0:v',
        '-vf', `fps=${fps}`,
        '-q:v', '5',
        videoPattern,
        // Audio output
        '-map', '0:a',
        '-ar', '16000',
        '-ac', '1',
        '-f', 's16le',
        '-y',
        audioFile
      );
    } else if (platform === 'linux') {
      // Linux typically needs separate inputs for video and audio
      args.push(
        '-f', device.format,
        '-framerate', fps.toString(),
        '-video_size', '320x240',
        '-i', device.video,
        '-f', 'alsa',
        '-i', device.audio,
        '-t', duration.toString(),
        '-map', '0:v',
        '-vf', `fps=${fps}`,
        '-q:v', '5',
        videoPattern,
        '-map', '1:a',
        '-ar', '16000',
        '-ac', '1',
        '-f', 's16le',
        '-y',
        audioFile
      );
    } else if (platform === 'win32') {
      args.push(
        '-f', device.format,
        '-i', `${device.video}:${device.audio}`,
        '-t', duration.toString(),
        '-map', '0:v',
        '-vf', `fps=${fps}`,
        '-q:v', '5',
        videoPattern,
        '-map', '0:a',
        '-ar', '16000',
        '-ac', '1',
        '-f', 's16le',
        '-y',
        audioFile
      );
    }

    log(`Starting audio+video capture for ${duration} seconds at ${fps} fps...`);

    await this.runFFmpeg(args, log);

    // Read audio
    let audioChunks: string[] = [];
    if (fs.existsSync(audioFile)) {
      const audioBuffer = fs.readFileSync(audioFile);
      audioChunks = this.splitAudioBuffer(audioBuffer);
      fs.unlinkSync(audioFile);
    }

    // Read video frames
    const videoFrames: string[] = [];
    let frameNum = 1;
    while (true) {
      const framePath = path.join(tempDir, `frame_${String(frameNum).padStart(4, '0')}.jpg`);
      if (!fs.existsSync(framePath)) break;

      const frameBuffer = fs.readFileSync(framePath);
      videoFrames.push(frameBuffer.toString('base64'));
      fs.unlinkSync(framePath);
      frameNum++;
    }

    return { audioChunks, videoFrames };
  }

  private runFFmpeg(args: string[], log: (msg: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', args);
      let stderr = '';

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        // Log progress info
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('time=') || line.includes('frame=')) {
            log(`FFmpeg: ${line.trim()}`);
          }
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`FFmpeg process error: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Extract meaningful error from stderr
          const errorLines = stderr.split('\n').filter(l =>
            l.includes('Error') || l.includes('error') || l.includes('Invalid')
          );
          reject(new Error(`FFmpeg exited with code ${code}: ${errorLines.join('; ') || stderr.slice(-500)}`));
        }
      });
    });
  }

  private splitAudioBuffer(buffer: Buffer, chunkSize: number = 8192): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
      chunks.push(chunk.toString('base64'));
    }
    return chunks;
  }

  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context);

    const mode = params.mode || 'audio'; // audio, video, both
    const duration = Number(params.duration) || 5;
    const fps = Number(params.fps) || 1;

    // Check FFmpeg availability
    const hasFFmpeg = await this.checkFFmpeg();
    if (!hasFFmpeg) {
      return {
        status: 'error',
        inputs: params,
        error: 'FFmpeg is not installed. Please install FFmpeg to use media capture in server mode.\n' +
          'macOS: brew install ffmpeg\n' +
          'Ubuntu: sudo apt install ffmpeg\n' +
          'Windows: Download from https://ffmpeg.org/download.html',
        logs: ['FFmpeg not found on system']
      };
    }

    log(`Starting ${mode} capture for ${duration} seconds (Server Mode with FFmpeg)...`);

    // List available devices (helpful for debugging)
    await this.listDevices(log);

    // Create temp directory for capture files
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gflow-media-'));

    const audioChunks: string[] = [];
    const videoFrames: string[] = [];

    try {
      if (mode === 'audio') {
        const chunks = await this.captureAudio(duration, tempDir, log);
        audioChunks.push(...chunks);
      } else if (mode === 'video') {
        const frames = await this.captureVideo(duration, fps, tempDir, log);
        videoFrames.push(...frames);
      } else if (mode === 'both') {
        const result = await this.captureBoth(duration, fps, tempDir, log);
        audioChunks.push(...result.audioChunks);
        videoFrames.push(...result.videoFrames);
      }

      // Cleanup temp directory
      try {
        fs.rmdirSync(tempDir);
      } catch (e) {
        // Ignore cleanup errors
      }

      log(`Capture finished. Audio chunks: ${audioChunks.length}, Video frames: ${videoFrames.length}`);

      return {
        status: 'success',
        inputs: params,
        output: {
          mode,
          duration,
          fps,
          audioData: audioChunks,
          videoFrames: videoFrames,
          timestamp: new Date().toISOString(),
          captureMethod: 'ffmpeg'
        },
        logs: [`Captured ${audioChunks.length} audio chunks and ${videoFrames.length} frames using FFmpeg`]
      };

    } catch (e: any) {
      // Cleanup on error
      try {
        // Remove any leftover files
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      return {
        status: 'error',
        inputs: params,
        error: e.message,
        logs: [`Capture failed: ${e.message}`]
      };
    }
  }
}