from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional, Any
from uuid import UUID
from supabase import Client

# ✅ IMPORTS COMPATIBLES CON VERCEL Y DESARROLLO LOCAL
try:
    from backend.supabase_client import get_supabase
    from backend import models
    from backend.utils import prepare_data_for_supabase
except ModuleNotFoundError:
    from supabase_client import get_supabase
    import models
    from utils import prepare_data_for_supabase

router = APIRouter(prefix="/api/videos", tags=["Videos"])

@router.post("/", response_model=models.Video, status_code=status.HTTP_201_CREATED)
def create_video(video: models.VideoCreate, db: Client = Depends(get_supabase)):
    """
    Create a new video in the videos table.
    """
    try:
        video_dict = prepare_data_for_supabase(video.model_dump())
        response = db.table("videos").insert(video_dict).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Failed to create video in Supabase."
            )
            
        created_item = response.data[0]
        
        # Inyectar el email del creador si existe created_by
        if created_item.get("created_by"):
            prof = db.table("profiles").select("email").eq("id", str(created_item["created_by"])).execute()
            if prof.data:
                created_item["created_by_email"] = prof.data[0].get("email")

        return created_item
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[models.Video])
def get_videos(db: Client = Depends(get_supabase)):
    """
    Get all videos with creator info, ordered by created_at descending.
    """
    try:
        # JOIN con la tabla profiles usando la FK created_by
        response = db.table("videos").select("*, profiles(email, full_name)").order("created_at", desc=True).execute()
        
        videos = []
        for item in response.data:
            profile = item.pop("profiles", None) or {}
            item["created_by_email"] = profile.get("email")
            videos.append(item)

        return videos
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to fetch videos: {str(e)}"
        )

@router.get("/{video_id}", response_model=models.Video)
def get_video(video_id: UUID, db: Client = Depends(get_supabase)):
    """
    Get a specific video by ID along with creator email.
    """
    try:
        response = db.table("videos").select("*, profiles(email, full_name)").eq("id", str(video_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Video not found"
            )
            
        item = response.data[0]
        profile = item.pop("profiles", None) or {}
        item["created_by_email"] = profile.get("email")

        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error retrieving video: {str(e)}"
        )

@router.put("/{video_id}", response_model=models.Video)
def update_video(video_id: UUID, video: models.VideoUpdate, db: Client = Depends(get_supabase)):
    """
    Update a video's fields.
    """
    try:
        video_dict = prepare_data_for_supabase(video.model_dump(exclude_unset=True))
        
        # If there are no fields to update, fetch current and return
        if not video_dict:
            response = db.table("videos").select("*, profiles(email)").eq("id", str(video_id)).execute()
            if not response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
            
            item = response.data[0]
            profile = item.pop("profiles", None) or {}
            item["created_by_email"] = profile.get("email")
            return item

        response = db.table("videos").update(video_dict).eq("id", str(video_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Video not found or update failed"
            )
            
        updated_item = response.data[0]
        if updated_item.get("created_by"):
            prof = db.table("profiles").select("email").eq("id", str(updated_item["created_by"])).execute()
            if prof.data:
                updated_item["created_by_email"] = prof.data[0].get("email")

        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(video_id: UUID, db: Client = Depends(get_supabase)):
    """
    Delete a video by ID.
    """
    try:
        # Check existence first
        exists_check = db.table("videos").select("id").eq("id", str(video_id)).execute()
        if not exists_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Video not found"
            )

        db.table("videos").delete().eq("id", str(video_id)).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to delete video: {str(e)}"
        )