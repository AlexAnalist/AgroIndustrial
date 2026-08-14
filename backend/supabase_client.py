import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

# Busca con y sin prefijo VITE_ para evitar fallos en Vercel
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")

SUPABASE_KEY = (
    os.getenv("SUPABASE_SECRET_KEY") 
    or os.getenv("SUPABASE_KEY") 
    or os.getenv("SUPABASE_PUBLISHABLE_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
    or os.getenv("VITE_SUPABASE_URL")
)

SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET") or os.getenv("VITE_STORAGE_BUCKET") or "agro-images"

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is not configured in the environment variables.")

if not SUPABASE_KEY:
    raise ValueError(
        "Neither SUPABASE_SECRET_KEY, SUPABASE_KEY, nor VITE_SUPABASE_ANON_KEY is configured."
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