#!/usr/bin/env python3
"""
Tele-Flix Smart Indexer (Final Fixed Version)
-------------------------
1. Fixes "Peer id invalid" (Restored the Dialog Sync).
2. Stable IDs + Anime Grouping + Smart Search.
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

CHANNEL_ID = -1003686417406
CHANNEL_LINK_ID = "3686417406"
OUTPUT_FILE = "client/public/movies.json"

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/multi"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
# -----------------------------------------------

def generate_stable_id(title: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', title.lower()).strip('-')
    hash_suffix = hashlib.md5(title.encode()).hexdigest()[:6]
    return f"id-{slug}-{hash_suffix}"

def clean_title_for_search(filename: str) -> tuple:
    name = re.sub(r'[_\.]', ' ', filename)
    name = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'^[Ww]atch\s+', '', name)
    name = re.sub(r'@\w+', '', name)
    name = re.sub(r'\[.*?\]', '', name) 
    name = re.sub(r'\(.*?\)', '', name)
    name = re.sub(r'\b(English|Sub|Dub|Dual|Audio|online|Free|on|HiAnime|1080p|720p|480p|x264|x265)\b.*', '', name, flags=re.IGNORECASE)

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

    year_match = re.search(r'\b(19[2-9]\d|20[0-2]\d)\b', name)
    year = None
    if year_match:
        year = year_match.group(0)
        name = name.replace(year, "")

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

    print(f"   🔎 Searching: '{title}'...")
    result = call_api(title)
    if result: return result

    words = title.split()
    if len(words) > 1:
        sub_title_1 = " ".join(words[1:]) 
        print(f"   ✂️  Trying: '{sub_title_1}'...")
        result = call_api(sub_title_1)
        if result: 
            print("   ✅ Match found via fallback!")
            return result

        sub_title_2 = " ".join(words[:-1])
        print(f"   ✂️  Trying: '{sub_title_2}'...")
        result = call_api(sub_title_2)
        if result:
            print("   ✅ Match found via fallback!")
            return result

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

    async with app:
        # --- FIX STARTS HERE ---
        print("Connected! Syncing dialogs to fix PeerID error...")
        try:
            # We must fetch dialogs first so Pyrogram learns about the channels you are in.
            async for dialog in app.get_dialogs():
                pass
        except Exception as e:
            print(f"Warning during dialog sync: {e}")
        # --- FIX ENDS HERE ---

        print("Scanning channel...")
        async for message in app.get_chat_history(CHANNEL_ID):
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
            group_key = get_group_key(search_title)
            stable_id = generate_stable_id(search_title)

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
                "link": f"https://t.me/c/{CHANNEL_LINK_ID}/{message.id}"
            }

            if group_key in grouped_content:
                grouped_content[group_key]["episodes"].append(episode_data)
                grouped_content[group_key]["type"] = "series"
            else:
                grouped_content[group_key] = {
                    "type": "movie",
                    "id": stable_id, 
                    "title": search_title,
                    "poster": poster,
                    "overview": overview,
                    "rating": rating,
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
                "rating": data["rating"]
            }
            final_list.append(movie_obj)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    print(f"\n🎉 Saved {len(final_list)} items to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(scan_channel())
