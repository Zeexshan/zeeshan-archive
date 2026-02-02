from pyrogram import Client
import os
import asyncio
from dotenv import load_dotenv

# Backup for loading secrets
load_dotenv()

# Load keys from Replit Secrets
# Note: Replit sometimes provides these as strings, so we convert ID to int
api_id_env = os.environ.get("TELEGRAM_API_ID")
api_hash = os.environ.get("TELEGRAM_API_HASH")


async def main():
    if not api_id_env or not api_hash:
        print(
            "❌ Error: TELEGRAM_API_ID or TELEGRAM_API_HASH not found in Secrets."
        )
        print("Please check your Replit Secrets tab (padlock icon).")
        return

    try:
        api_id = int(api_id_env)
        # Indentation fixed below:
        async with Client("zeeshan_temp_access",
                          api_id,
                          api_hash,
                          in_memory=True) as app:
            print("\n--------------------------------------------------")
            print("HERE IS YOUR SESSION STRING (Copy all of it):")
            print("--------------------------------------------------\n")
            session_string = await app.export_session_string()
            print(session_string)
            print("\n--------------------------------------------------")
    except ValueError:
        print("❌ Error: TELEGRAM_API_ID must be a number.")
    except Exception as e:
        print(f"\n❌ Connection Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
