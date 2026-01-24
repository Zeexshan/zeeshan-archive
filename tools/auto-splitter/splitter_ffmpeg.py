import os
import subprocess
import time
import shutil
import json
import math

# --- CONFIGURATION ---
INPUT_FOLDER = "input"
OUTPUT_FOLDER = "output"
# LOWERED TARGET to 1500MB (1.5GB) to handle bitrate spikes safely
TARGET_SIZE_MB = 1500  

def get_video_info(file_path):
    """Get duration and size using ffprobe."""
    # We use file size from OS because ffprobe packet sum can be slow
    try:
        total_size = os.path.getsize(file_path)
        
        cmd = [
            "ffprobe", "-v", "error", 
            "-show_entries", "format=duration", 
            "-of", "json", file_path
        ]
        
        # Hide window on Windows to prevent popping up
        startupinfo = None
        if os.name == 'nt':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            check=True,
            startupinfo=startupinfo
        )
        
        data = json.loads(result.stdout)
        duration = float(data['format']['duration'])
        return duration, total_size
    except Exception as e:
        print(f"⚠️  Analysis failed (will retry): {e}")
        return None, None

def split_ffmpeg(file_path, file_name):
    print(f"🎬 Analyzing: {file_name}...")
    duration, size_bytes = get_video_info(file_path)
    
    if not duration or not size_bytes:
        print("❌ Skipping file (could not read info).")
        return

    # Calculate size per second
    size_mb = size_bytes / (1024 * 1024)
    avg_mb_per_sec = size_mb / duration
    
    # SAFETY CALCULATION:
    # We target 1500MB. If the movie has a complex scene, it might balloon to 1800MB.
    # This keeps it safely under the 2000MB Telegram limit.
    safe_segment_time = TARGET_SIZE_MB / avg_mb_per_sec
    
    # Round down to nearest minute for cleaner timestamps (optional, but nice)
    safe_segment_time = math.floor(safe_segment_time)

    parts_estimated = math.ceil(size_mb / TARGET_SIZE_MB)
    
    print(f"📊 Stats: {int(duration/60)} min, {int(size_mb)} MB.")
    print(f"🛡️  Safe Mode: Splitting every {int(safe_segment_time/60)} min (Est. {parts_estimated} parts)")

    # Clean output filename
    base_name = os.path.splitext(file_name)[0]
    output_pattern = os.path.join(OUTPUT_FOLDER, f"{base_name}_part%03d.mkv")
    
    cmd = [
        "ffmpeg", "-i", file_path,
        "-c", "copy",       # Stream Copy (Zero quality loss)
        "-map", "0",        # Keep all tracks (Audio/Subs)
        "-f", "segment",    # Split mode
        "-segment_time", str(safe_segment_time),
        "-reset_timestamps", "1",
        output_pattern
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"✅ Success! Check '{OUTPUT_FOLDER}'")
        # os.remove(file_path) # Uncomment to auto-delete original
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg Error: {e}")

def main():
    if not shutil.which("ffmpeg"):
        print("❌ Error: ffmpeg.exe not found.")
        return

    print("👀 Watching 'input' folder... (Safe Mode Active)")
    
    while True:
        try:
            for file_name in os.listdir(INPUT_FOLDER):
                file_path = os.path.join(INPUT_FOLDER, file_name)
                
                if os.path.isfile(file_path) and file_name.lower().endswith(('.mkv', '.mp4', '.avi')):
                    # Wait if file is still copying (size changing)
                    try:
                        sz1 = os.path.getsize(file_path)
                        time.sleep(2)
                        sz2 = os.path.getsize(file_path)
                        if sz1 != sz2: continue 
                        
                        # Process
                        if sz2 < (TARGET_SIZE_MB * 1024 * 1024):
                            print(f"📦 {file_name} is small. Moving...")
                            shutil.move(file_path, os.path.join(OUTPUT_FOLDER, file_name))
                        else:
                            split_ffmpeg(file_path, file_name)
                            try:
                                os.remove(file_path)
                            except: pass
                            
                    except Exception as e:
                        print(f"⚠️ File error: {e}")
                        
        except KeyboardInterrupt:
            print("\nStopping...")
            break
        except Exception as e:
            print(f"Loop error: {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    if not os.path.exists(INPUT_FOLDER): os.makedirs(INPUT_FOLDER)
    if not os.path.exists(OUTPUT_FOLDER): os.makedirs(OUTPUT_FOLDER)
    main()