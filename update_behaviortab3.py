import re

file_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\components\dashboard\BehaviorTab.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Patch handleAnalyze
old_analyze = """    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setAnalyzing(true);"""

new_analyze = """    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    if (localMediaUrl) {
      URL.revokeObjectURL(localMediaUrl);
      setLocalMediaUrl(null);
      setLocalMediaType('');
    }
    
    setAnalyzing(true);"""
content = content.replace(old_analyze, new_analyze)

# 2. Patch startRecording
old_start = """  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });"""

new_start = """  const startRecording = async () => {
    if (localMediaUrl) {
      URL.revokeObjectURL(localMediaUrl);
      setLocalMediaUrl(null);
      setLocalMediaType('');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });"""
content = content.replace(old_start, new_start)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied to clear old media.")
