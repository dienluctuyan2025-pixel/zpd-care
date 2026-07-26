import re

file_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\components\dashboard\BehaviorTab.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

blob_to_wav_fn = """
const blobToWav = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + audioBuffer.length * numOfChan * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, audioBuffer.length * numOfChan * 2, true);
  
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      let sample = audioBuffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
};
"""

# Insert blobToWav function before `export default function BehaviorTab`
content = content.replace("export default function BehaviorTab", blob_to_wav_fn + "\nexport default function BehaviorTab")


old_onstop = """      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length > 0) {
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const fileExtension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          
          audioBlob.name = `recording.${fileExtension}`;
          
          handleFileUpload({ target: { files: [audioBlob] } });
        } else {
            toastError("Không thu được dữ liệu âm thanh. Vui lòng thử lại.");
        }
        setIsRecording(false);
        setRecordingTime(0);
        clearInterval(timerIntervalRef.current);
      };"""


new_onstop = """      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length > 0) {
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          let audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Chuyển đổi WebM sang WAV ngay trên trình duyệt để Gemini nhận diện chuẩn xác
          try {
              audioBlob = await blobToWav(audioBlob);
              audioBlob.name = 'recording.wav';
          } catch(e) {
              console.error("WAV conversion failed", e);
              const fileExtension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
              audioBlob.name = `recording.${fileExtension}`;
          }
          
          handleFileUpload({ target: { files: [audioBlob] } });
        } else {
            toastError("Không thu được dữ liệu âm thanh. Vui lòng thử lại.");
        }
        setIsRecording(false);
        setRecordingTime(0);
        clearInterval(timerIntervalRef.current);
      };"""

content = content.replace(old_onstop, new_onstop)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
