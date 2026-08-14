from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List
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

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])

@router.post("/", response_model=models.Profile, status_code=status.HTTP_201_CREATED)
def create_profile(profile: models.ProfileCreate, db: Client = Depends(get_supabase)):
    """
    Create a new profile. The ID must match the UUID from auth.users in Supabase.
    """
    try:
        profile_dict = prepare_data_for_supabase(profile.model_dump())
        response = db.table("profiles").insert(profile_dict).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Profile could not be created in Supabase database."
            )
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[models.Profile])
def get_profiles(db: Client = Depends(get_supabase)):
    """
    Get all user profiles ordered by creation date.
    """
    try:
        response = db.table("profiles").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to fetch profiles: {str(e)}"
        )

@router.get("/{profile_id}", response_model=models.Profile)
def get_profile(profile_id: UUID, db: Client = Depends(get_supabase)):
    """
    Get a specific profile by UUID.
    """
    try:
        response = db.table("profiles").select("*").eq("id", str(profile_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Profile not found"
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error retrieving profile: {str(e)}"
        )

@router.put("/{profile_id}", response_model=models.Profile)
def update_profile(profile_id: UUID, profile: models.ProfileUpdate, db: Client = Depends(get_supabase)):
    """
    Update profile data by UUID.
    """
    try:
        profile_dict = prepare_data_for_supabase(profile.model_dump(exclude_unset=True))
        
        # If there is nothing to update, return the current database record
        if not profile_dict:
            response = db.table("profiles").select("*").eq("id", str(profile_id)).execute()
            if not response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
            return response.data[0]

        response = db.table("profiles").update(profile_dict).eq("id", str(profile_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Profile not found or update failed"
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: UUID, db: Client = Depends(get_supabase)):
    """
    Delete a specific profile by UUID.
    """
    try:
        # Check existence first
        exists_check = db.table("profiles").select("id").eq("id", str(profile_id)).execute()
        if not exists_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Profile not found"
            )

        db.table("profiles").delete().eq("id", str(profile_id)).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to delete profile: {str(e)}"
        )