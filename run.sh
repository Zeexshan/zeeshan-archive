#!/bin/bash
# Tele-Flix Archive Indexer Runner
# Run this script to scan your Telegram channel and update the movie database

echo "==================================="
echo "  Tele-Flix Archive Indexer"
echo "==================================="
echo ""

# Check if environment variables are set
if [ -z "$TELEGRAM_API_ID" ] || [ -z "$TELEGRAM_API_HASH" ]; then
    echo "Error: Telegram API credentials not found!"
    echo ""
    echo "Please set the following in Replit Secrets:"
    echo "  - TELEGRAM_API_ID"
    echo "  - TELEGRAM_API_HASH"
    echo ""
    echo "You can get these from: https://my.telegram.org"
    exit 1
fi

echo "Starting channel scan..."
echo ""

python indexer.py

echo ""
echo "==================================="
echo "  Indexer Complete!"
echo "==================================="
