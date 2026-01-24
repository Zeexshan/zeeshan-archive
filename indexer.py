#!/usr/bin/env python3
"""
Tele-Flix Archive Indexer
-------------------------
Scans a Telegram channel and extracts movie information into a JSON database.
Fetches movie posters, overviews, and ratings from TMDB.
Groups series episodes into folder structures.
"""

import os
import re
import json
import asyncio
import requests
from pyrogram import Client
from pyrogram.enums import MessageMediaType

# Telegram API credentials from environment variables
API_ID = os.environ.get("TELEGRAM_API_ID")
API_HASH = os.environ.get("TELEGRAM_API_HASH")

# TMDB API key
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# Target channel ID (note the negative sign)
CHANNEL_ID = -1003686417406

# Channel ID for links (without -100 prefix)
CHANNEL_LINK_ID = "3686417406"

# Output file
OUTPUT_FILE = "client/public/movies.json"


def search_tmdb(title: str, is_series: bool = False) -> dict:
    """
    Search TMDB for movie/series information.
    Returns poster_path, overview, and vote_average if found.
    """
    if not TMDB_API_KEY:
        return {}
    
    # Clean the title for search
    search_title = title.strip()
    
    if not search_title:
        return {}
    
    try:
        # Choose endpoint based on type
        if is_series:
            endpoint = f"{TMDB_BASE_URL}/search/tv"
        else:
            endpoint = f"{TMDB_BASE_URL}/search/movie"
        
        response = requests.get(
            endpoint,
            params={
                "api_key": TMDB_API_KEY,
                "query": search_title,
                "language": "en-US",
                "page": 1
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("results"):
                result = data["results"][0]
                poster_path = result.get("poster_path")
                return {
                    "poster": f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else None,
                    "overview": result.get("overview") or None,
                    "rating": result.get("vote_average") or None
                }
        
        # If primary search failed, try the opposite type
        fallback_endpoint = f"{TMDB_BASE_URL}/search/{'movie' if is_series else 'tv'}"
        response = requests.get(
            fallback_endpoint,
            params={
                "api_key": TMDB_API_KEY,
                "query": search_title,
                "language": "en-US",
                "page": 1
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("results"):
                result = data["results"][0]
                poster_path = result.get("poster_path")
                return {
                    "poster": f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else None,
                    "overview": result.get("overview") or None,
                    "rating": result.get("vote_average") or None
                }
    except requests.RequestException as e:
        print(f"TMDB API error for '{search_title}': {e}")
    
    return {}


def parse_filename(filename: str) -> dict:
    """
    Parse a filename and extract title, episode info, and determine if it's a series.
    
    Returns:
        dict with keys: title, episode_id, is_series, clean_title
    """
    if not filename:
        return {"title": "Unknown Title", "episode_id": None, "is_series": False, "clean_title": "Unknown Title"}
    
    # Remove file extension first
    filename = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$', '', filename, flags=re.IGNORECASE)
    
    # Try to find season/episode pattern
    season_episode_match = re.search(r'[.\s_-](S\d{1,2}E\d{1,2})[.\s_-]?', filename, re.IGNORECASE)
    
    if season_episode_match:
        # This is a series episode
        series_part = filename[:season_episode_match.start()]
        episode_id = season_episode_match.group(1).upper()
        
        # Clean the series name
        series_name = re.sub(r'[._]+', ' ', series_part).strip()
        series_name = re.sub(r'\s*[-–]+\s*$', '', series_name).strip()
        series_name = ' '.join(word.capitalize() for word in series_name.split())
        
        return {
            "title": f"{series_name} - {episode_id}",
            "episode_id": episode_id,
            "is_series": True,
            "clean_title": series_name
        }
    
    # Not a series - clean as a movie title
    patterns_to_remove = [
        r'[\.\s_-]?(2160p|1080p|720p|480p|4K|UHD|HD|SD)',
        r'[\.\s_-]?(BluRay|Blu-Ray|BDRip|BRRip|WEB-DL|WEBRip|HDTV|DVDRip|HDRip|CAM|TS|TC|DVDSCR)',
        r'[\.\s_-]?(x265|x264|HEVC|H\.?265|H\.?264|AVC|XviD|DivX|VP9|AV1)',
        r'[\.\s_-]?(AAC|AC3|DTS|DTS-HD|Atmos|TrueHD|FLAC|MP3|DD5\.1|5\.1|7\.1|2\.0)',
        r'[\.\s_-]?(10bit|10-bit|8bit|8-bit|HDR|HDR10|Dolby Vision|DV)',
        r'[\.\s_-]?(Pahe\.in|RARBG|YTS|YIFY|MX|SPARKS|GECKOS|AMIABLE|FGT|EVO|STUTTERSHIT)',
        r'[\.\s_-]?(FLUX|NTb|MIXED|SMURF|TOMMY|ION10|DEFLATE|SPARKS|MZABI)',
        r'\[.*?\]',
        r'\(.*?\)',
        r'\s*[-–]\s*[A-Za-z0-9]+$',
        r'[\(\[]?\d{4}[\)\]]?',
    ]
    
    cleaned = filename
    for pattern in patterns_to_remove:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    cleaned = re.sub(r'[._]+', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = re.sub(r'\s*[-–]+\s*$', '', cleaned).strip()
    
    if cleaned:
        cleaned = ' '.join(word.capitalize() for word in cleaned.split())
    
    title = cleaned if cleaned else "Unknown Title"
    
    return {
        "title": title,
        "episode_id": None,
        "is_series": False,
        "clean_title": title
    }


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
    
    if not TMDB_API_KEY:
        print("Warning: TMDB_API_KEY not set. Posters and ratings will not be fetched.")
    
    print("Connecting to Telegram...")
    
    app = Client(
        "tele_flix_session",
        api_id=int(API_ID),
        api_hash=API_HASH,
        workdir="."
    )
    
    # Temporary storage for raw items
    standalone_movies = []
    series_dict = {}  # Key: series title, Value: list of episodes
    tmdb_cache = {}
    
    async with app:
        print("Connected!")
        
        # Sync dialogs to cache peer IDs
        print("Syncing dialogs to cache peer IDs...")
        dialog_count = 0
        async for dialog in app.get_dialogs():
            dialog_count += 1
        print(f"Synced {dialog_count} dialogs.")
        
        print(f"Scanning channel {CHANNEL_ID}...")
        
        message_count = 0
        media_count = 0
        
        async for message in app.get_chat_history(CHANNEL_ID):
            message_count += 1
            
            if not message.media:
                continue
            
            if message.media not in [MessageMediaType.VIDEO, MessageMediaType.DOCUMENT]:
                continue
            
            file_name = None
            file_size = 0
            
            if message.video:
                file_name = message.video.file_name
                file_size = message.video.file_size or 0
            elif message.document:
                file_name = message.document.file_name
                file_size = message.document.file_size or 0
                
                if file_name:
                    video_extensions = ('.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v')
                    if not file_name.lower().endswith(video_extensions):
                        continue
            
            if not file_name:
                continue
            
            # Parse the filename
            parsed = parse_filename(file_name)
            formatted_size = format_file_size(file_size)
            telegram_link = f"https://t.me/c/{CHANNEL_LINK_ID}/{message.id}"
            
            if parsed["is_series"]:
                # Group into series
                series_title = parsed["clean_title"]
                
                if series_title not in series_dict:
                    series_dict[series_title] = {
                        "episodes": [],
                        "tmdb_fetched": False
                    }
                
                episode = {
                    "title": parsed["title"],
                    "episodeId": parsed["episode_id"],
                    "size": formatted_size,
                    "link": telegram_link
                }
                series_dict[series_title]["episodes"].append(episode)
            else:
                # Standalone movie
                # Get TMDB data
                if parsed["clean_title"] not in tmdb_cache:
                    print(f"Fetching TMDB data for movie: {parsed['clean_title']}")
                    tmdb_cache[parsed["clean_title"]] = search_tmdb(parsed["clean_title"], is_series=False)
                
                tmdb_data = tmdb_cache[parsed["clean_title"]]
                
                movie = {
                    "type": "movie",
                    "id": f"movie-{media_count}",
                    "title": parsed["title"],
                    "size": formatted_size,
                    "link": telegram_link,
                    "poster": tmdb_data.get("poster"),
                    "overview": tmdb_data.get("overview"),
                    "rating": tmdb_data.get("rating")
                }
                standalone_movies.append(movie)
            
            media_count += 1
            
            if message_count % 50 == 0:
                print(f"Processed {message_count} messages, found {media_count} media files...")
    
    print(f"\nScan complete!")
    print(f"Total messages scanned: {message_count}")
    print(f"Media files found: {media_count}")
    
    # Process series and fetch TMDB data
    series_list = []
    series_id = 0
    
    for series_title, series_data in series_dict.items():
        # Fetch TMDB data for series
        print(f"Fetching TMDB data for series: {series_title}")
        tmdb_data = search_tmdb(series_title, is_series=True)
        
        # Sort episodes by episode ID
        episodes = sorted(series_data["episodes"], key=lambda e: e["episodeId"])
        
        series = {
            "type": "series",
            "id": f"series-{series_id}",
            "title": series_title,
            "poster": tmdb_data.get("poster"),
            "overview": tmdb_data.get("overview"),
            "rating": tmdb_data.get("rating"),
            "episodeCount": len(episodes),
            "episodes": episodes
        }
        series_list.append(series)
        series_id += 1
    
    # Combine all items: series first, then movies
    all_items = series_list + standalone_movies
    
    print(f"\nOrganized into {len(series_list)} series and {len(standalone_movies)} standalone movies")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE) or '.', exist_ok=True)
    
    # Save to JSON file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_items, f, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(all_items)} entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(scan_channel())
