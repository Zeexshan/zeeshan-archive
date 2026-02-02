#!/usr/bin/env python3
"""
Tele-Flix Smart Indexer (Anime & Movie Fix)
-------------------------
1. Fixes "From Up on Poppy Hill" (removed 'on' from cutoff list).
2. Fixes "Your Name 2160p" (added 2160p/BluRay/4k to cleaner).
3. Includes PeerID Fix (Dialog Sync).
"""

import os
import re
import json
import asyncio
import hashlib
import requests
from pyrogram import Client

# ---------------- CONFIGURATION ----------------
API_ID = os.environ.get("TELEGRAM_API_ID")
API_HASH = os.environ.get("TELEGRAM_API_HASH")
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")

CHANNELS = [
    {"id": -1003838058874, "link_id": "3838058874", "category": "anime"},
    {"id": -1003747953815, "link_id": "3747953815", "category": "j-horror"}
]
OUTPUT_FILE = "client/public/movies.json"

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/multi"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
# -----------------------------------------------

def generate_stable_id(title: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', title.lower()).strip('-')
    hash_suffix = hashlib.md5(title.encode()).hexdigest()[:6]
    return f"id-{slug}-{hash_suffix}"

def clean_title_for_search(filename: str) -> tuple:
    """
    Surgical Cleaner: Removes tech jargon but respects title words like 'on'.
    """
    # 1. Standard Cleanup
    name = re.sub(r'[_\.]', ' ', filename)
    name = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$', '', name, flags=re.IGNORECASE)
    
    # 2. Remove Junk Prefixes
    name = re.sub(r'^[Ww]atch\s+', '', name)
    name = re.sub(r'@\w+', '', name)
    name = re.sub(r'\[.*?\]', '', name) 
    name = re.sub(r'\(.*?\)', '', name)

    # 3. THE FIX: "Cutoff" logic. 
    # Everything after these words is considered junk.
    # REMOVED: 'on', 'English' (Too dangerous for titles)
    # ADDED: '2160p', 'BluRay', '4k', 'WebRip'
    cutoff_keywords = [
        r'Sub', r'Dub', r'Dual', r'Audio', r'online', r'Free', r'HiAnime',
        r'1080p', r'720p', r'480p', r'2160p', r'4k', r'BluRay', r'WebRip', r'WEBRip',
        r'x264', r'x265', r'HEVC', r'10bit', r'HDR'
    ]
    cutoff_pattern = r'\b(' + '|'.join(cutoff_keywords) + r')\b.*'
    name = re.sub(cutoff_pattern, '', name, flags=re.IGNORECASE)

    # 4. Remove remaining technical stray words (if they appeared in middle)
    tech_trash = [
        r'AAC', r'5\.1', r'7\.1', r'AC3', r'EAC3', r'DTS', r'TrueHD',
        r'H\.264', r'H\.265', r'DVDRip', r'HDTV'
    ]
    name = re.sub(r'\b(' + '|'.join(tech_trash) + r')\b', '', name, flags=re.IGNORECASE)

    # 5. Detect Episode Numbering
    episode_patterns = [
        r'[.\s_-](S\d+E\d+|S\d+|E\d+)',
        r'\b(Episode|Ep\.?|EP\-?)\s*\d+',
        r'\s-\s+\d+'
    ]
    for pattern in episode_patterns:
        match = re.search(pattern, name, re.IGNORECASE)
        if match:
            name = name[:match.start()]
            break

    # 6. Extract Year
    year_match = re.search(r'\b(19[2-9]\d|20[0-2]\d)\b', name)
    year = None
    if year_match:
        year = year_match.group(0)
        name = name.replace(year, "")

    # 7. Final Polish
    name = re.sub(r'[^a-zA-Z0-9\s!&,\'-]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return (name, year)

def get_group_key(title: str) -> str:
    return re.sub(r'[^a-zA-Z0-9]', '', title.lower())

def search_tmdb_recursive(title: str, year: str = None):
    if not TMDB_API_KEY or not title: return None

    def call_api(query):
        params = {
            "api_key": TMDB_API_KEY,
            "query": query,
            "include_adult": "false",
            "language": "en-US"
        }
        if year: params["year"] = year
        try:
            res = requests.get(TMDB_SEARCH_URL, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("results"): return data["results"][0]
        except: pass
        return None

    # Attempt 1: Full Title
    print(f"   🔎 Searching: '{title}'...")
    result = call_api(title)
    if result: return result

    # Attempt 2: Smart Chopping
    words = title.split()
    if len(words) > 1:
        # Try removing first word
        sub_title_1 = " ".join(words[1:]) 
        print(f"   ✂️  Trying: '{sub_title_1}'...")
        result = call_api(sub_title_1)
        if result: return result

        # Try removing last word
        sub_title_2 = " ".join(words[:-1])
        print(f"   ✂️  Trying: '{sub_title_2}'...")
        result = call_api(sub_title_2)
        if result: return result

    return None

def format_file_size(size_bytes: int) -> str:
    if size_bytes < 0: return "Unknown"
    if size_bytes >= 1024**3: return f"{size_bytes / (1024**3):.1f} GB"
    return f"{size_bytes / (1024**2):.1f} MB"

async def scan_channel():
    if not API_ID or not API_HASH:
        print("Error: TELEGRAM credentials missing.")
        return

    print("Connecting to Telegram...")
    session_string = os.environ.get("TELEGRAM_SESSION_STRING")

    if session_string:
        app = Client("tele_flix_session", api_id=int(API_ID), api_hash=API_HASH, session_string=session_string, in_memory=True)
    else:
        app = Client("tele_flix_session", api_id=int(API_ID), api_hash=API_HASH, workdir=".")

    grouped_content = {}
    tmdb_cache = {}

    # Load existing data to preserve manual overrides
    existing_overrides = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                for item in existing_data:
                    if item.get("customTitle") or item.get("customPoster"):
                        existing_overrides[item["id"]] = {
                            "customTitle": item.get("customTitle"),
                            "customPoster": item.get("customPoster"),
                            "customOverview": item.get("customOverview")
                        }
        except: pass

    async with app:
        print("Connected! Syncing dialogs to fix PeerID error...")
        try:
            async for dialog in app.get_dialogs(): pass
        except Exception as e:
            print(f"Warning during dialog sync: {e}")

        for channel in CHANNELS:
            print(f"Scanning channel: {channel['category']} ({channel['id']})...")
            async for message in app.get_chat_history(channel["id"]):
                if not message.media: continue

                file_name = None
                file_size = 0
                if message.video:
                    file_name = message.video.file_name
                    file_size = message.video.file_size
                elif message.document:
                    file_name = message.document.file_name
                    file_size = message.document.file_size

                if not file_name: continue

                search_title, year = clean_title_for_search(file_name)
                group_key = f"{channel['category']}_{get_group_key(search_title)}"
                stable_id = generate_stable_id(f"{channel['category']}_{search_title}")

                if search_title not in tmdb_cache:
                    metadata = search_tmdb_recursive(search_title, year)
                    if metadata:
                        poster = f"{TMDB_IMAGE_BASE}{metadata.get('poster_path')}" if metadata.get("poster_path") else None
                        tmdb_cache[search_title] = (poster, metadata.get("overview"), metadata.get("vote_average"))
                    else:
                        tmdb_cache[search_title] = (None, None, 0)

                poster, overview, rating = tmdb_cache[search_title]

                episode_data = {
                    "title": file_name, 
                    "episodeId": file_name, 
                    "size": format_file_size(file_size or 0),
                    "link": f"https://t.me/c/{channel['link_id']}/{message.id}"
                }

                if group_key in grouped_content:
                    grouped_content[group_key]["episodes"].append(episode_data)
                    grouped_content[group_key]["type"] = "series"
                else:
                    overrides = existing_overrides.get(stable_id, {})
                    grouped_content[group_key] = {
                        "type": "movie",
                        "id": stable_id, 
                        "title": search_title,
                        "poster": poster,
                        "overview": overview,
                        "rating": rating,
                        "category": channel["category"],
                        "customTitle": overrides.get("customTitle"),
                        "customPoster": overrides.get("customPoster"),
                        "customOverview": overrides.get("customOverview"),
                        "episodes": [episode_data]
                    }

    final_list = []
    for key, data in grouped_content.items():
        if len(data["episodes"]) > 1:
            data["episodes"].sort(key=lambda x: x['title'])
            data["episodeCount"] = len(data["episodes"])
            final_list.append(data)
        else:
            single_ep = data["episodes"][0]
            movie_obj = {
                "type": "movie",
                "id": data["id"],
                "title": data["title"],
                "size": single_ep["size"],
                "link": single_ep["link"],
                "poster": data["poster"],
                "overview": data["overview"],
                "rating": data["rating"],
                "category": data.get("category", "anime"),
                "customTitle": data.get("customTitle"),
                "customPoster": data.get("customPoster"),
                "customOverview": data.get("customOverview")
            }
            final_list.append(movie_obj)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    print(f"\n🎉 Saved {len(final_list)} items to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(scan_channel())
