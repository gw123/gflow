import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * PlayMediaNodeRunnerServer - Node.js implementation for media playback
 * 
 * Uses system audio/video players or FFPlay to play media.
 * 
 * Supports:
 * - Base64 encoded PCM audio (from MediaCapture)
 * - Base64 encoded video frames (as slideshow)
 * - URLs (opens in default browser/player)
 * - Local file paths
 */
export class PlayMediaNodeRunnerServer implements NodeRunner {

  private async checkFFPlay(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ffplay', ['-version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  private async checkFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', ['-version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * Convert raw PCM to WAV format using ffmpeg
   * This allows playback with system audio players like afplay
   */
  private async convertRawToWav(
    rawPath: string,
    wavPath: string,
    log: (msg: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-f', 's16le',      // Input format: 16-bit signed little-endian
        '-ar', '16000',     // Input sample rate: 16kHz
        '-ac', '1',         // Input channels: mono
        '-i', rawPath,      // Input file
        '-y',               // Overwrite output
        wavPath             // Output file
      ];

      log('Converting raw PCM to WAV...');
      const proc = spawn('ffmpeg', args);

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`FFmpeg conversion error: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg conversion failed with code ${code}: ${stderr.slice(-200)}`));
        }
      });
    });
  }

  /**
   * Play raw audio by converting to WAV first, then using system player
   * This is more reliable than ffplay on macOS
   */
  private async playRawAudioWithConversion(
    rawPath: string,
    tempDir: string,
    log: (msg: string) => void
  ): Promise<void> {
    const wavPath = path.join(tempDir, 'audio.wav');

    // Convert raw PCM to WAV
    await this.convertRawToWav(rawPath, wavPath, log);

    // Play with system audio player
    await this.playAudioWithSystem(wavPath, log);
  }

  private async playAudioWithSystem(filePath: string, log: (msg: string) => void): Promise<void> {
    const platform = os.platform();

    return new Promise((resolve, reject) => {
      let proc: ChildProcess;

      if (platform === 'darwin') {
        // macOS - use afplay
        log('Playing audio with afplay...');
        proc = spawn('afplay', [filePath]);
      } else if (platform === 'linux') {
        // Linux - use aplay for raw audio, or ffplay for others
        log('Playing audio with aplay...');
        proc = spawn('aplay', ['-f', 'S16_LE', '-r', '16000', '-c', '1', filePath]);
      } else if (platform === 'win32') {
        // Windows - use PowerShell to play audio
        log('Playing audio with PowerShell...');
        proc = spawn('powershell', [
          '-Command',
          `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`
        ]);
      } else {
        reject(new Error(`Unsupported platform for audio playback: ${platform}`));
        return;
      }

      proc.on('error', (err) => {
        reject(new Error(`Audio playback failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Audio player exited with code ${code}`));
        }
      });
    });
  }

  private async playWithFFPlay(
    filePath: string,
    isRawAudio: boolean,
    log: (msg: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args: string[] = [];

      if (isRawAudio) {
        // For raw audio, format options MUST come before the input file
        // Note: ffplay uses -ch_layout instead of -ac
        args.push(
          '-f', 's16le',          // 16-bit signed little-endian
          '-ar', '16000',         // 16kHz sample rate
          '-ch_layout', 'mono',   // Mono channel layout (ffplay doesn't support -ac)
          '-i', filePath,
          '-autoexit',            // Exit when playback is complete
          '-nodisp'               // No display window (for audio)
        );
      } else {
        args.push(
          '-autoexit',
          '-nodisp',
          '-i', filePath
        );
      }

      log(`Playing with ffplay: ffplay ${args.join(' ')}`);
      const proc = spawn('ffplay', args);

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`FFPlay error: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Include stderr output in error for debugging
          const errorMsg = stderr.split('\n').filter(l => l.includes('Error') || l.includes('error')).join('; ');
          reject(new Error(`FFPlay exited with code ${code}: ${errorMsg || stderr.slice(-200)}`));
        }
      });
    });
  }

  private async createVideoFromFrames(
    frames: string[],
    fps: number,
    tempDir: string,
    log: (msg: string) => void
  ): Promise<string> {
    // Write frames as images
    for (let i = 0; i < frames.length; i++) {
      const framePath = path.join(tempDir, `frame_${String(i + 1).padStart(4, '0')}.jpg`);
      const buffer = Buffer.from(frames[i], 'base64');
      fs.writeFileSync(framePath, buffer);
    }

    const outputPath = path.join(tempDir, 'video.mp4');
    const inputPattern = path.join(tempDir, 'frame_%04d.jpg');

    // Use FFmpeg to create video from frames
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-framerate', fps.toString(),
        '-i', inputPattern,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath
      ];

      log(`Creating video from ${frames.length} frames at ${fps} fps...`);
      const proc = spawn('ffmpeg', args);

      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });

    return outputPath;
  }

  private async playVideo(filePath: string, log: (msg: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      log('Playing video with ffplay...');

      const proc = spawn('ffplay', [
        '-autoexit',
        '-fs',  // Fullscreen (optional)
        filePath
      ]);

      proc.on('error', (err) => {
        reject(new Error(`FFPlay error: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFPlay exited with code ${code}`));
        }
      });
    });
  }

  private async openUrl(url: string, log: (msg: string) => void): Promise<void> {
    const platform = os.platform();

    return new Promise((resolve, reject) => {
      let proc: ChildProcess;

      if (platform === 'darwin') {
        log(`Opening URL with open: ${url}`);
        proc = spawn('open', [url]);
      } else if (platform === 'linux') {
        log(`Opening URL with xdg-open: ${url}`);
        proc = spawn('xdg-open', [url]);
      } else if (platform === 'win32') {
        log(`Opening URL with start: ${url}`);
        proc = spawn('cmd', ['/c', 'start', '', url]);
      } else {
        reject(new Error(`Unsupported platform: ${platform}`));
        return;
      }

      proc.on('error', (err) => reject(err));
      proc.on('close', () => resolve());
    });
  }

  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context, node);

    const mediaType = params.mediaType || 'audio'; // audio, video
    let data = params.data;

    if (!data) {
      return { status: 'skipped', logs: ['No media data provided'] };
    }

    // Check for ffplay availability
    const hasFFPlay = await this.checkFFPlay();

    log(`Playing ${mediaType} (Server Mode)...`);

    // Create temp directory for media files
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gflow-play-'));

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

      // Video playback
      if (videoFrames && videoFrames.length > 0) {
        if (!hasFFPlay) {
          throw new Error('FFPlay is required for video playback. Please install FFmpeg.');
        }

        log(`Playing ${videoFrames.length} video frames at ${fps} fps...`);

        // Create video file from frames
        const videoPath = await this.createVideoFromFrames(videoFrames, fps, tempDir, log);

        // If we also have audio, combine them
        if (audioData && audioData.length > 0) {
          // Write audio to file
          const audioBuffer = Buffer.concat(audioData.map(chunk => Buffer.from(chunk, 'base64')));
          const audioPath = path.join(tempDir, 'audio.raw');
          fs.writeFileSync(audioPath, audioBuffer);

          // Combine audio and video with FFmpeg
          const combinedPath = path.join(tempDir, 'combined.mp4');
          await new Promise<void>((resolve, reject) => {
            const args = [
              '-i', videoPath,
              '-f', 's16le',
              '-ar', '16000',
              '-ac', '1',
              '-i', audioPath,
              '-c:v', 'copy',
              '-c:a', 'aac',
              '-shortest',
              '-y',
              combinedPath
            ];

            log('Combining audio and video...');
            const proc = spawn('ffmpeg', args);
            proc.on('error', reject);
            proc.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`FFmpeg combine failed with code ${code}`));
            });
          });

          await this.playVideo(combinedPath, log);
        } else {
          await this.playVideo(videoPath, log);
        }
      }
      // Audio only playback
      else if (audioData && audioData.length > 0) {
        // Combine all audio chunks into one file
        const audioBuffer = Buffer.concat(audioData.map(chunk => Buffer.from(chunk, 'base64')));
        const audioPath = path.join(tempDir, 'audio.raw');
        fs.writeFileSync(audioPath, audioBuffer);

        log(`Playing ${audioData.length} audio chunks (${(audioBuffer.length / 32000).toFixed(2)}s)...`);

        // Check if ffmpeg is available for conversion
        const hasFFmpeg = await this.checkFFmpeg();
        const platform = os.platform();

        if (hasFFmpeg && platform === 'darwin') {
          // On macOS, convert to WAV and use afplay (most reliable)
          await this.playRawAudioWithConversion(audioPath, tempDir, log);
        } else if (hasFFPlay) {
          // Try ffplay on other platforms
          await this.playWithFFPlay(audioPath, true, log);
        } else if (platform === 'linux') {
          // Linux can use aplay for raw audio directly
          await this.playAudioWithSystem(audioPath, log);
        } else {
          throw new Error('No audio player available. Please install ffmpeg.');
        }
      }
      // URL handling
      else if (typeof data === 'string' && data.startsWith('http')) {
        await this.openUrl(data, log);
      }
      // Local file path
      else if (typeof data === 'string' && fs.existsSync(data)) {
        if (hasFFPlay) {
          const isAudio = mediaType === 'audio' ||
            ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(path.extname(data).toLowerCase());

          if (isAudio) {
            await this.playWithFFPlay(data, false, log);
          } else {
            await this.playVideo(data, log);
          }
        } else {
          await this.openUrl(data, log);
        }
      } else {
        log("Unsupported media format or empty data.");
      }

      // Cleanup temp files
      this.cleanupTempDir(tempDir);

      return {
        status: 'success',
        inputs: params,
        output: { played: true, method: hasFFPlay ? 'ffplay' : 'system' },
        logs: [`Finished playing media`]
      };

    } catch (e: any) {
      // Cleanup on error
      this.cleanupTempDir(tempDir);

      return {
        status: 'error',
        inputs: params,
        error: e.message,
        logs: [`Play failed: ${e.message}`]
      };
    }
  }

  private cleanupTempDir(tempDir: string) {
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}