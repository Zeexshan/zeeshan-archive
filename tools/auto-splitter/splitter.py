import os
import subprocess
import time
import shutil

# --- CONFIGURATION ---
INPUT_FOLDER = "input"
OUTPUT_FOLDER = "output"
# Path to mkvmerge.exe (Check your installation path!)
MKVMERGE_PATH = r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\MKVToolNix"
SPLIT_SIZE = "1900M"  # 1.9GB (Safe for 2GB Telegram limit)

def split_file(file_path, file_name):
    print(f"🔪 Processing: {file_name}...")
    
    # Create the command to split by size
    # Output format: output/MovieName-001.mkv, MovieName-002.mkv
    output_pattern = os.path.join(OUTPUT_FOLDER, f"{os.path.splitext(file_name)[0]}-%03d.mkv")
    
    cmd = [
        MKVMERGE_PATH,
        "-o", output_pattern,
        "--split", f"size:{SPLIT_SIZE}",
        file_path
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"✅ Success! Parts are in '{OUTPUT_FOLDER}'")
        
        # Optional: Delete original after split to save space
        # os.remove(file_path) 
        # print("🗑️  Original file removed.")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error splitting file: {e}")

def main():
    print("👀 Watching 'input' folder for large files...")
    while True:
        # Check files in input folder
        for file_name in os.listdir(INPUT_FOLDER):
            file_path = os.path.join(INPUT_FOLDER, file_name)
            
            # Process only video files
            if os.path.isfile(file_path) and file_name.lower().endswith(('.mkv', '.mp4', '.avi')):
                # Check size (if smaller than 1.9GB, just move it to output)
                size_mb = os.path.getsize(file_path) / (1024 * 1024)
                
                if size_mb < 1900:
                    print(f"📦 File is small ({int(size_mb)}MB). Moving directly...")
                    shutil.move(file_path, os.path.join(OUTPUT_FOLDER, file_name))
                else:
                    split_file(file_path, file_name)
                    # Move original to 'done' folder or delete it so we don't process it again
                    os.remove(file_path) 
                    
        time.sleep(5) # Check every 5 seconds

if __name__ == "__main__":
    if not os.path.exists(INPUT_FOLDER): os.makedirs(INPUT_FOLDER)
    if not os.path.exists(OUTPUT_FOLDER): os.makedirs(OUTPUT_FOLDER)
    main()