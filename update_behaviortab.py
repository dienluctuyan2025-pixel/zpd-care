import re

file_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\components\dashboard\BehaviorTab.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix setLocalMediaType logic
old_set_type = "setLocalMediaType(file.type.startsWith('audio/') ? 'audio' : 'video');"
new_set_type = """let mediaType = 'unknown';
    if (file.type.startsWith('audio/')) mediaType = 'audio';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('image/')) mediaType = 'image';
    setLocalMediaType(mediaType);"""
content = content.replace(old_set_type, new_set_type)

# 2. Fix rendering logic
old_render = """{localMediaType === 'video' ? (
                      <video ref={mediaRef} src={localMediaUrl} controls style={{ width: '100%', maxHeight: 360, display: 'block' }} />
                    ) : (
                      <audio ref={mediaRef} src={localMediaUrl} controls style={{ width: '100%', margin: '16px 0', padding: '0 16px' }} />
                    )}"""
new_render = """{localMediaType === 'video' ? (
                      <video ref={mediaRef} src={localMediaUrl} controls style={{ width: '100%', maxHeight: 360, display: 'block' }} />
                    ) : localMediaType === 'audio' ? (
                      <audio ref={mediaRef} src={localMediaUrl} controls style={{ width: '100%', margin: '16px 0', padding: '0 16px' }} />
                    ) : localMediaType === 'image' ? (
                      <img src={localMediaUrl} style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block' }} alt="Preview" />
                    ) : null}"""
content = content.replace(old_render, new_render)

# 3. Fix handleSeek to not crash on images
old_seek = """  const handleSeek = (timeStr) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = parseTime(timeStr);
      mediaRef.current.play().catch(() => {});
    }
  };"""
new_seek = """  const handleSeek = (timeStr) => {
    if (mediaRef.current && typeof mediaRef.current.currentTime !== 'undefined') {
      mediaRef.current.currentTime = parseTime(timeStr);
      if (typeof mediaRef.current.play === 'function') {
        mediaRef.current.play().catch(() => {});
      }
    }
  };"""
content = content.replace(old_seek, new_seek)

# 4. Add safety to startRecording so it stops after 5 minutes
old_interval = """      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);"""
new_interval = """      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // 5 minutes limit
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
               mediaRecorderRef.current.stop();
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);"""
content = content.replace(old_interval, new_interval)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied successfully.")
