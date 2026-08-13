import io
import os
from datetime import datetime
from uuid import UUID, uuid4
from PIL import Image
from supabase import Client

def prepare_data_for_supabase(data_dict: dict) -> dict:
    """
    Surgical utility to convert UUID and datetime objects in a dict to 
    safe, standard string representations for Supabase query execution.
    Removes keys with None values to let Supabase DB defaults handle them.
    """
    cleaned = {}
    for k, v in data_dict.items():
        if v is None:
            continue  # Skip None values to respect DB defaults
        elif isinstance(v, UUID):
            cleaned[k] = str(v)
        elif isinstance(v, datetime):
            cleaned[k] = v.isoformat()
        else:
            cleaned[k] = v
    return cleaned

def process_and_upload_image(
    supabase_client: Client,
    file_bytes: bytes,
    original_filename: str,
    bucket_name: str = "agro-images",
    max_width: int = 1200,
    quality: int = 75
) -> str:
    """
    Advanced helper that resizes and compresses image data using Pillow,
    uploads it to the Supabase Storage bucket, and returns its public URL.
    Generates a unique name to prevent any collisions or caching issues.
    """
    try:
        # Load image via Pillow from memory bytes
        image = Image.open(io.BytesIO(file_bytes))
        
        # Optimize size: Downscale image if width exceeds max_width
        if image.width > max_width:
            ratio = max_width / float(image.width)
            new_height = int(float(image.height) * ratio)
            # Use Resampling.LANCZOS (Pillow v9+)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # JPEG does not support alpha (RGBA/P) transparency, convert to standard RGB
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
            
        # Write back to memory buffer as optimized JPEG
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality)
        buffer.seek(0)
        
        # Extract file extension or default to .jpg
        _, ext = os.path.splitext(original_filename)
        if not ext:
            ext = ".jpg"
            
        # Unique file naming (using UUIDv4 prefix) for robust backend management
        unique_filename = f"{uuid4()}{ext}"
        file_path = f"gallery/{unique_filename}"
        
        # Upload using the storage client API
        supabase_client.storage.from_(bucket_name).upload(
            path=file_path,
            file=buffer.getvalue(),
            file_options={"content-type": "image/jpeg"}
        )
        
        # Retrieve the public access URL
        public_url = supabase_client.storage.from_(bucket_name).get_public_url(file_path)
        return public_url
    except Exception as e:
        raise RuntimeError(f"Error processing and uploading image: {str(e)}")
