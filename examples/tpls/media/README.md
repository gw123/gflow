# 媒体处理示例

本目录包含音视频采集和播放的工作流示例。

## 文件说明

### audio-capture.yaml
音频采集示例：
- 从麦克风/系统音频采集
- 音频格式转换
- 保存音频文件

### video-playback.yaml
视频播放控制示例：
- 播放媒体文件
- 控制播放参数
- 播放状态监控

## 媒体节点类型

### 媒体采集 (media_capture)

```yaml
- name: "CaptureAudio"
  type: "media_capture"
  parameters:
    source: "microphone"  # microphone, system_audio, camera
    format: "wav"          # wav, mp3, webm
    duration: 5000         # 采集时长（毫秒）
    sampleRate: 44100
    channels: 2
```

### 媒体播放 (play_media)

```yaml
- name: "PlayAudio"
  type: "play_media"
  parameters:
    source: "={{ $P.audioPath }}"  # 文件路径或 URL
    type: "audio"                   # audio, video
    volume: 0.8                     # 0.0 - 1.0
    autoplay: true
```

## 支持的格式

### 音频格式
- WAV (推荐，无损)
- MP3
- OGG
- WebM

### 视频格式
- MP4
- WebM
- MOV (仅 macOS)

## 服务器端 vs 浏览器端

媒体处理节点的行为会根据运行环境有所不同：

**浏览器端：**
- 使用 Web Audio API
- 支持实时预览
- 受浏览器权限限制

**服务器端：**
- 使用 FFmpeg
- 支持更多格式
- 可处理大文件

## 注意事项

1. 服务器端需要安装 FFmpeg
2. 浏览器端需要用户授权麦克风/摄像头
3. 大文件处理建议使用流式处理
4. 注意音频采样率的兼容性
