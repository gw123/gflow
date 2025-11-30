
import { decodeAudioData, downsampleTo16000, base64ToUint8Array } from '../node_runners/audioUtils';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private audioWorkletNode: AudioWorkletNode | null = null;
  private ttsSource: AudioBufferSourceNode | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;

  async initialize(): Promise<AudioContext> {
    if (this.audioContext) {
      // If already running/suspended, just resume/return
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return this.audioContext;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio API is not supported in this browser.");
    }

    this.audioContext = new AudioContextClass();
    this.nextStartTime = this.audioContext.currentTime;

    return this.audioContext;
  }

  async startCapture(onAudioData: (data: Float32Array) => void) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone not supported");
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await this.initialize();
      
      // Prefer ScriptProcessor for simplicity in this context (Worklet requires external file loading)
      this.setupScriptProcessor(this.stream, onAudioData);
  }

  async setupAudioWorklet(stream: MediaStream, onAudioData: (data: Float32Array) => void) {
    if (!this.audioContext) throw new Error("AudioContext not initialized");

    try {
      // Note: This requires the worklet file to be served at root. 
      // Fallback to ScriptProcessor is robust for single-bundle apps.
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');
      
      this.audioWorkletNode.port.onmessage = (event) => {
        const inputData = event.data.audioData;
        const downsampledData = downsampleTo16000(inputData, this.audioContext!.sampleRate);
        onAudioData(downsampledData);
      };
      
      source.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination);
      
      return true;
    } catch (error) {
      console.warn("AudioWorklet not available, using fallback");
      return false;
    }
  }

  setupScriptProcessor(stream: MediaStream, onAudioData: (data: Float32Array) => void) {
    if (!this.audioContext) throw new Error("AudioContext not initialized");

    const source = this.audioContext.createMediaStreamSource(stream);
    // 4096 buffer size offers a balance between latency and performance
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const downsampledData = downsampleTo16000(inputData, this.audioContext!.sampleRate);
      onAudioData(downsampledData);
    };
    
    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  async playAudioBuffer(audioData: string, sampleRate: number = 24000): Promise<number> {
    if (!this.audioContext) await this.initialize();
    if (!this.audioContext) throw new Error("AudioContext failed to init");

    const audioBuffer = await decodeAudioData(
      base64ToUint8Array(audioData),
      this.audioContext,
      sampleRate
    );

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const start = Math.max(now, this.nextStartTime);
    source.start(start);
    this.nextStartTime = start + audioBuffer.duration;

    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
    
    // Return duration in seconds
    return audioBuffer.duration;
  }

  stopAllAudio() {
    this.sources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore
      }
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async cleanup() {
    this.stopAllAudio();
    
    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    
    if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (e) {
        console.error(e);
      }
      this.audioContext = null;
    }
  }
}

export class VideoService {
  private videoStream: MediaStream | null = null;
  private frameInterval: number | null = null;
  private frameRate: number = 2;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  async startCamera(): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera not supported");
    }

    this.videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240 }
    });

    return this.videoStream;
  }

  // Internal helper to create invisible elements for capture if not provided
  private ensureElements() {
      if (!this.videoElement) {
          this.videoElement = document.createElement('video');
          this.videoElement.muted = true;
          this.videoElement.playsInline = true;
          this.videoElement.style.display = 'none'; // Hidden capture
          document.body.appendChild(this.videoElement);
      }
      if (!this.canvasElement) {
          this.canvasElement = document.createElement('canvas');
          this.canvasElement.style.display = 'none';
          document.body.appendChild(this.canvasElement);
      }
  }

  async startCapture(onFrame: (base64: string) => void) {
      this.ensureElements();
      const stream = await this.startCamera();
      
      if (this.videoElement) {
          this.videoElement.srcObject = stream;
          await this.videoElement.play();
          
          this.startFrameCapture(this.videoElement, this.canvasElement!, onFrame);
      }
  }

  startFrameCapture(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onFrame: (base64: string) => void
  ) {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
    }

    this.frameInterval = window.setInterval(() => {
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;

      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      // Use lower quality for throughput
      const base64 = canvasElement.toDataURL('image/jpeg', 0.6).split(',')[1];
      onFrame(base64);
    }, 1000 / this.frameRate);
  }

  stopFrameCapture() {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
  }

  stopCamera() {
    this.stopFrameCapture();
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    
    // Cleanup DOM
    if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement.remove();
        this.videoElement = null;
    }
    if (this.canvasElement) {
        this.canvasElement.remove();
        this.canvasElement = null;
    }
  }

  setFrameRate(fps: number) {
    this.frameRate = fps;
  }

  async playVideoFrames(frames: string[], fps: number = 2) {
      if (!frames || frames.length === 0) return;

      // Better Overlay UI
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '9999',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)',
          animation: 'fadeIn 0.2s ease-out'
      });
      
      const container = document.createElement('div');
      Object.assign(container.style, {
          position: 'relative',
          padding: '12px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
          maxWidth: '90vw',
          maxHeight: '90vh'
      });

      const img = document.createElement('img');
      Object.assign(img.style, {
          maxWidth: '100%',
          maxHeight: '70vh',
          borderRadius: '8px',
          display: 'block',
          objectFit: 'contain'
      });
      container.appendChild(img);
      
      // Progress Bar
      const progressContainer = document.createElement('div');
      Object.assign(progressContainer.style, {
          width: '100%',
          height: '6px',
          backgroundColor: '#334155',
          marginTop: '15px',
          borderRadius: '3px',
          overflow: 'hidden'
      });
      const progressBar = document.createElement('div');
      Object.assign(progressBar.style, {
          width: '0%',
          height: '100%',
          backgroundColor: '#3b82f6',
          transition: 'width 0.1s linear'
      });
      progressContainer.appendChild(progressBar);
      container.appendChild(progressContainer);

      // Info text
      const infoText = document.createElement('div');
      infoText.innerText = `Loading Video...`;
      Object.assign(infoText.style, {
          color: '#94a3b8',
          fontSize: '12px',
          marginTop: '8px',
          textAlign: 'center',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontWeight: '500'
      });
      container.appendChild(infoText);

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      `;
      Object.assign(closeBtn.style, {
          position: 'absolute',
          top: '-15px',
          right: '-15px',
          background: '#ef4444',
          color: 'white',
          border: '4px solid #0f172a',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      });
      
      let stopped = false;
      closeBtn.onclick = () => {
          stopped = true;
          if (document.body.contains(overlay)) {
              document.body.removeChild(overlay);
          }
      };
      container.appendChild(closeBtn);

      overlay.appendChild(container);
      document.body.appendChild(overlay);

      const interval = 1000 / fps;
      
      for (let i = 0; i < frames.length; i++) {
          if (stopped) break;
          img.src = `data:image/jpeg;base64,${frames[i]}`;
          const progress = ((i + 1) / frames.length) * 100;
          progressBar.style.width = `${progress}%`;
          
          const currentTime = Math.round((i+1)/fps * 10) / 10;
          const totalTime = Math.round(frames.length/fps * 10) / 10;
          infoText.innerText = `Frame ${i + 1} / ${frames.length} • ${currentTime}s / ${totalTime}s`;
          
          await new Promise(resolve => setTimeout(resolve, interval));
      }

      // Auto close after a short delay if not stopped
      if (!stopped) {
          infoText.innerText = "Playback Finished";
          setTimeout(() => {
              if (document.body.contains(overlay)) {
                  document.body.removeChild(overlay);
              }
          }, 1500);
      }
  }
}
