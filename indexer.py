#!/usr/bin/env python3
"""
Tele-Flix Archive Indexer
-------------------------
Scans a Telegram channel and extracts movie information into a JSON database.
"""

import os
import re
import json
import asyncio
from pyrogram import Client
from pyrogram.enums import MessageMediaType

# Telegram API credentials from environment variables
API_ID = os.environ.get("TELEGRAM_API_ID")
API_HASH = os.environ.get("TELEGRAM_API_HASH")

# Target channel ID (note the negative sign)
CHANNEL_ID = -1003686417406

# Channel ID for links (without -100 prefix)
CHANNEL_LINK_ID = "3686417406"

# Output file
OUTPUT_FILE = "movies.json"


def clean_filename(filename: str) -> str:
    """
    Intelligently clean anime/series filenames to extract a readable title.
    
    Input: Frieren.Beyond.Journeys.End.S01E01.The.Journeys.End.1080p.BluRay.x265.AAC.2.0-Pahe.in
    Output: Frieren Beyond Journeys End - S01E01
    """
    if not filename:
        return "Unknown Title"
    
    # Remove file extension first
    filename = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$', '', filename, flags=re.IGNORECASE)
    
    # Try to find season/episode pattern
    season_episode_match = re.search(r'[.\s_-](S\d{1,2}E\d{1,2})[.\s_-]?', filename, re.IGNORECASE)
    
    if season_episode_match:
        # Extract the series name (everything before the season/episode)
        series_part = filename[:season_episode_match.start()]
        episode_id = season_episode_match.group(1).upper()
        
        # Replace dots, underscores with spaces
        series_name = re.sub(r'[._]+', ' ', series_part).strip()
        
        # Remove any trailing hyphens or dashes
        series_name = re.sub(r'\s*[-–]+\s*$', '', series_name).strip()
        
        # Capitalize properly
        series_name = ' '.join(word.capitalize() for word in series_name.split())
        
        return f"{series_name} - {episode_id}"
    
    # No season/episode found - clean as a movie title
    # Remove common release group tags and quality indicators
    patterns_to_remove = [
        # Quality indicators
        r'[\.\s_-]?(2160p|1080p|720p|480p|4K|UHD|HD|SD)',
        # Source types
        r'[\.\s_-]?(BluRay|Blu-Ray|BDRip|BRRip|WEB-DL|WEBRip|HDTV|DVDRip|HDRip|CAM|TS|TC|DVDSCR)',
        # Codecs
        r'[\.\s_-]?(x265|x264|HEVC|H\.?265|H\.?264|AVC|XviD|DivX|VP9|AV1)',
        # Audio formats
        r'[\.\s_-]?(AAC|AC3|DTS|DTS-HD|Atmos|TrueHD|FLAC|MP3|DD5\.1|5\.1|7\.1|2\.0)',
        # Bit depth
        r'[\.\s_-]?(10bit|10-bit|8bit|8-bit|HDR|HDR10|Dolby Vision|DV)',
        # Release groups (common ones)
        r'[\.\s_-]?(Pahe\.in|RARBG|YTS|YIFY|MX|SPARKS|GECKOS|AMIABLE|FGT|EVO|STUTTERSHIT)',
        r'[\.\s_-]?(FLUX|NTb|MIXED|SMURF|TOMMY|ION10|DEFLATE|SPARKS|MZABI)',
        # Brackets with release info
        r'\[.*?\]',
        r'\(.*?\)',
        # Anything after a hyphen at the end (usually release group)
        r'\s*[-–]\s*[A-Za-z0-9]+$',
        # Year in parentheses or brackets
        r'[\(\[]?\d{4}[\)\]]?',
    ]
    
    cleaned = filename
    for pattern in patterns_to_remove:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    # Replace dots and underscores with spaces
    cleaned = re.sub(r'[._]+', ' ', cleaned)
    
    # Remove multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    # Remove trailing hyphens
    cleaned = re.sub(r'\s*[-–]+\s*$', '', cleaned).strip()
    
    # Capitalize words
    if cleaned:
        cleaned = ' '.join(word.capitalize() for word in cleaned.split())
    
    return cleaned if cleaned else "Unknown Title"


def format_file_size(size_bytes: int) -> str:
    """Convert bytes to human-readable format (e.g., 1.4 GB)"""
    if size_bytes < 0:
        return "Unknown"
    
    gb = size_bytes / (1024 ** 3)
    if gb >= 1:
        return f"{gb:.1f} GB"
    
    mb = size_bytes / (1024 ** 2)
    if mb >= 1:
        return f"{mb:.1f} MB"
    
    kb = size_bytes / 1024
    return f"{kb:.1f} KB"


async def scan_channel():
    """Scan the Telegram channel and extract movie information."""
    
    if not API_ID or not API_HASH:
        print("Error: TELEGRAM_API_ID and TELEGRAM_API_HASH environment variables are required.")
        print("Please set them in Replit Secrets.")
        return
    
    print(f"Connecting to Telegram...")
    
    # Create Pyrogram client
    app = Client(
        "tele_flix_session",
        api_id=int(API_ID),
        api_hash=API_HASH,
        workdir="."
    )
    
    movies = []
    
    async with app:
        print(f"Connected! Scanning channel {CHANNEL_ID}...")
        
        message_count = 0
        media_count = 0
        
        async for message in app.get_chat_history(CHANNEL_ID):
            message_count += 1
            
            # Skip messages without media
            if not message.media:
                continue
            
            # Only process video files or documents
            if message.media not in [MessageMediaType.VIDEO, MessageMediaType.DOCUMENT]:
                continue
            
            # Get file info
            file_name = None
            file_size = 0
            
            if message.video:
                file_name = message.video.file_name
                file_size = message.video.file_size or 0
            elif message.document:
                file_name = message.document.file_name
                file_size = message.document.file_size or 0
                
                # Skip non-video documents based on extension
                if file_name:
                    video_extensions = ('.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v')
                    if not file_name.lower().endswith(video_extensions):
                        continue
            
            if not file_name:
                continue
            
            # Clean the filename
            clean_title = clean_filename(file_name)
            
            # Format file size
            formatted_size = format_file_size(file_size)
            
            # Generate Telegram link
            telegram_link = f"https://t.me/c/{CHANNEL_LINK_ID}/{message.id}"
            
            movie = {
                "title": clean_title,
                "size": formatted_size,
                "link": telegram_link
            }
            
            movies.append(movie)
            media_count += 1
            
            # Progress indicator every 100 messages
            if message_count % 100 == 0:
                print(f"Processed {message_count} messages, found {media_count} media files...")
    
    print(f"\nScan complete!")
    print(f"Total messages scanned: {message_count}")
    print(f"Media files found: {media_count}")
    
    # Save to JSON file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(movies, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(movies)} entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(scan_channel())
