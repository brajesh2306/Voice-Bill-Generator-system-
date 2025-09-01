import os
import sounddevice as sd
import numpy as np
import whisper
import tempfile
import wave

"""# 🔹 Add ffmpeg path (agar PATH me add nahi kiya hai)
os.environ["PATH"] += os.pathsep + r"X:\\ffmpeg-8.0-essentials_build\\bin"

# 🔹 Whisper model load
model = whisper.load_model("medium")

def transcribe_file(duration=10, fs=16000):
    print(f"🎙 Recording {duration} seconds... bolna start kar")
    
    # Record audio
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype="int16")
    sd.wait()  # wait until recording finishes
    
    # Save temp wav file
    temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
    with wave.open(temp_wav, 'wb') as wf:
        wf.setnchannels(1)       # Mono
        wf.setsampwidth(2)       # 16-bit audio
        wf.setframerate(fs)      # Sampling rate
        wf.writeframes(recording.tobytes())
    
    print("✅ Recording done, transcribing...")
    
    # Transcribe with Whisper
    result = model.transcribe(temp_wav, language="en")
    return result["text"]

if __name__ == "__main__":
    text = transcribe_file(duration=10)
    print("👉 Transcribed Text:", text)
"""
# backend/app/recorder.py
# Optional: Windows me ffmpeg path add karo (edit as per your system)
FFMPEG_BIN = os.getenv("X:\\ffmpeg-8.0-essentials_build\\bin")  # e.g. X:\ffmpeg-8.0-essentials_build\bin
if FFMPEG_BIN:
    os.environ["PATH"] += os.pathsep + FFMPEG_BIN

# Whisper model load once
_model = whisper.load_model("medium")  # "small" fast/stable; change to "medium" if GPU

def transcribe_file(file_path: str) -> str:
    """
    Browser se aaya audio file (webm/wav/m4a...) ko transcribe karta hai.
    ffmpeg installed hona chahiye.
    """
    try:
        result = _model.transcribe(file_path,language="en")  # language auto-detect
        return result.get("text", "").strip()
    except Exception as e:
        print("Whisper error:", e)
        return ""
