import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Prefer the service key (SUPABASE_SECRET_KEY) for backend operations, 
# with fallback to anon key (SUPABASE_KEY or SUPABASE_PUBLISHABLE_KEY)
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "agro-images")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is not configured in the environment variables.")

if not SUPABASE_KEY:
    raise ValueError(
        "Neither SUPABASE_SECRET_KEY nor SUPABASE_KEY is configured in the environment variables. "
        "Please specify at least one of them."
    )

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")

def get_supabase() -> Client:
    """
    Dependency helper to inject the Supabase client into FastAPI endpoints.
    """
    return supabase
