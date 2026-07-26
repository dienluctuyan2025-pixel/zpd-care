import re

file_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\components\dashboard\BehaviorTab.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix handleFileUpload previous url leak
old_upload = """    const formData = new FormData();
    formData.append("file", file, file.name || "recording.webm");

    const url = URL.createObjectURL(file);
    setLocalMediaUrl(url);"""

new_upload = """    const formData = new FormData();
    formData.append("file", file, file.name || "recording.webm");

    if (localMediaUrl) {
      URL.revokeObjectURL(localMediaUrl);
    }
    const url = URL.createObjectURL(file);
    setLocalMediaUrl(url);"""
content = content.replace(old_upload, new_upload)

# 2. Add useEffect for unmount cleanup
old_useeffect = """  useEffect(() => {
    const saved = sessionStorage.getItem(`draft-${studentId}`);
    if (saved) {
      setText(saved);
    }
  }, [studentId]);"""

new_useeffect = """  useEffect(() => {
    const saved = sessionStorage.getItem(`draft-${studentId}`);
    if (saved) {
      setText(saved);
    }
  }, [studentId]);

  useEffect(() => {
    return () => {
      if (localMediaUrl) {
        URL.revokeObjectURL(localMediaUrl);
      }
    };
  }, [localMediaUrl]);"""
content = content.replace(old_useeffect, new_useeffect)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied for URL leaks.")
