# Video Processing Implementation

## Overview

Videos are automatically processed before upload to:
1. **Trim to 10 seconds** - Limits video length
2. **Compress** - Reduces file size significantly
3. **Optimize** - Converts to web-friendly format (MP4/H.264)

## Features

### ✅ Automatic Processing
- Videos are automatically trimmed to 10 seconds if longer
- Videos are compressed to reduce file size
- All videos are converted to MP4 format for compatibility

### ✅ User Experience
- Progress indicator shows processing status
- First-time load downloads FFmpeg (~10MB, cached after)
- Clear error messages if processing fails
- Videos that are already ≤10s and small skip processing

### ✅ Validation
- Checks video duration before processing
- Warns user if video exceeds 10 seconds
- Validates file types and sizes

## Technical Details

### FFmpeg.wasm
- **Library**: `@ffmpeg/ffmpeg` and `@ffmpeg/util`
- **Size**: ~10MB (downloaded once per session, cached)
- **Location**: Loaded from CDN (unpkg.com)
- **Performance**: Runs in browser using WebAssembly

### Processing Settings

```typescript
- Duration: Trimmed to 10 seconds max
- Video Codec: H.264 (libx264)
- Quality: CRF 28 (good balance)
- Preset: Fast (good speed/quality ratio)
- Audio: AAC at 128kbps
- Format: MP4 with faststart (web optimized)
```

### Compression Results

Expected reductions:
- **File size**: 30-70% reduction
- **Duration**: Trimmed to 10s max
- **Format**: Standardized to MP4

Example:
- 50MB, 30s video → ~15MB, 10s video (70% reduction)

## User Flow

1. User selects video file
2. System validates duration (warns if >10s)
3. FFmpeg loads (first time only, ~10MB download)
4. Video is trimmed to 10 seconds
5. Video is compressed
6. Processed video is added to upload queue
7. Upload proceeds normally

## Error Handling

- **FFmpeg load fails**: Falls back to original file, shows error
- **Processing fails**: Shows alert, doesn't add file
- **Invalid format**: Caught by file validation
- **Too large**: Caught by file validation

## Performance Considerations

### First Load
- Downloads ~10MB FFmpeg core files
- Takes 5-15 seconds depending on connection
- Files are cached by browser

### Processing Time
- Depends on video length and size
- Typical: 10-30 seconds for a 10s clip
- Runs in background (non-blocking)

### Memory Usage
- FFmpeg uses WebAssembly (efficient)
- Processes one video at a time
- Memory is freed after processing

## Limitations

1. **Browser Support**: Requires modern browser with WebAssembly
2. **Processing Time**: Can take 10-30 seconds per video
3. **First Load**: Downloads ~10MB on first video upload
4. **Large Files**: Very large videos (>100MB) may timeout

## Future Enhancements

1. **Progress Callback**: Show detailed FFmpeg progress
2. **Quality Options**: Let users choose compression level
3. **Thumbnail Generation**: Extract video thumbnail
4. **Server-Side Processing**: Move to Edge Function for better performance
5. **Batch Processing**: Process multiple videos in parallel

## Configuration

Settings can be adjusted in `lib/video-processing.ts`:

```typescript
const MAX_VIDEO_DURATION = 10; // seconds
const MAX_VIDEO_SIZE_MB = 50; // target size after compression
```

FFmpeg settings in `processVideo()`:
- `crf 28`: Quality (lower = better, higher = smaller)
- `preset fast`: Speed vs quality
- `b:a 128k`: Audio bitrate

