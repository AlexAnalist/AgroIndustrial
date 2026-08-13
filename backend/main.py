import os
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()

# Import Supabase Client & Utilities
from supabase_client import get_supabase, SUPABASE_BUCKET
from utils import process_and_upload_image, prepare_data_for_supabase
import models

# Import modular routers
from routers import profiles, articles, videos, gallery

# Initialize FastAPI App
app = FastAPI(
    title="Agroindustrial API",
    description="Modular backend integrated with Supabase (Database & Storage)",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers
app.include_router(profiles.router)
app.include_router(articles.router)
app.include_router(videos.router)
app.include_router(gallery.router)


@app.get("/")
def read_root():
    """
    Root status check endpoint.
    """
    return {
        "status": "online",
        "message": "Agroindustrial API with Supabase is running smoothly.",
        "version": "1.0.0"
    }


# ==========================================
# BACKWARDS COMPATIBILITY LAYER (LEGACY)
# ==========================================
@app.post(
    "/api/upload-image", 
    response_model=models.GalleryImage, 
    status_code=status.HTTP_201_CREATED, 
    tags=["Legacy"],
    deprecated=True
)
async def legacy_upload_image(
    file: UploadFile = File(...), 
    title: str = "Nueva Imagen", 
    category: str = "General",
    db: Client = Depends(get_supabase)
):
    """
    Legacy endpoint for uploading images to retain complete backwards compatibility
    with frontend versions that expect the older '/api/upload-image' route.
    Maps the input 'category' to the new schema's 'description' field.
    """
    try:
        # Read uploaded image bytes
        file_bytes = await file.read()
        
        # Call optimized process & upload helper
        public_url = process_and_upload_image(
            supabase_client=db,
            file_bytes=file_bytes,
            original_filename=file.filename,
            bucket_name=SUPABASE_BUCKET
        )
        
        # Build gallery image model mapping category to description
        new_image = models.GalleryImageCreate(
            title=title,
            description=f"Categoría: {category}",
            image_url=public_url,
            uploaded_by=None
        )
        
        image_dict = prepare_data_for_supabase(new_image.model_dump())
        response = db.table("gallery_images").insert(image_dict).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File successfully uploaded to Storage, but DB insert failed."
            )
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
