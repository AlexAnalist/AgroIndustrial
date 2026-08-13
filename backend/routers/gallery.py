import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional
from uuid import UUID
from supabase import Client
from supabase_client import get_supabase, SUPABASE_BUCKET
import models
from utils import prepare_data_for_supabase, process_and_upload_image

router = APIRouter(prefix="/api/gallery", tags=["Gallery"])


# --------------------------------------------------------------------------
# 1. CREAR REGISTRO CON URL PREISTENTE
# --------------------------------------------------------------------------
@router.post("/", response_model=models.GalleryImage, status_code=status.HTTP_201_CREATED)
def create_gallery_image(image: models.GalleryImageCreate, db: Client = Depends(get_supabase)):
    """
    Create a new gallery image entry directly with a pre-existing image URL.
    """
    try:
        image_dict = prepare_data_for_supabase(image.model_dump())
        response = db.table("gallery_images").insert(image_dict).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Failed to create gallery image in Supabase."
            )
        
        created_item = response.data[0]
        
        # Inyectar el email del perfil si existe uploaded_by
        if created_item.get("uploaded_by"):
            prof = db.table("profiles").select("email").eq("id", str(created_item["uploaded_by"])).execute()
            if prof.data:
                created_item["uploaded_by_email"] = prof.data[0].get("email")

        return created_item
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --------------------------------------------------------------------------
# 2. OBTENER TODAS LAS IMÁGENES
# --------------------------------------------------------------------------
@router.get("/", response_model=List[models.GalleryImage])
def get_gallery_images(db: Client = Depends(get_supabase)):
    """
    Get all gallery images with uploader profile info, ordered by created_at descending.
    """
    try:
        # JOIN con la tabla profiles usando uploaded_by
        response = db.table("gallery_images").select("*, profiles(email, full_name)").order("created_at", desc=True).execute()
        
        gallery = []
        for item in response.data:
            profile = item.pop("profiles", None) or {}
            item["uploaded_by_email"] = profile.get("email")
            gallery.append(item)

        return gallery
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to fetch gallery images: {str(e)}"
        )


# --------------------------------------------------------------------------
# 3. OBTENER IMAGEN POR ID
# --------------------------------------------------------------------------
@router.get("/{image_id}", response_model=models.GalleryImage)
def get_gallery_image(image_id: UUID, db: Client = Depends(get_supabase)):
    """
    Get a specific gallery image entry by ID along with uploader email.
    """
    try:
        response = db.table("gallery_images").select("*, profiles(email, full_name)").eq("id", str(image_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Gallery image not found"
            )
        
        item = response.data[0]
        profile = item.pop("profiles", None) or {}
        item["uploaded_by_email"] = profile.get("email")

        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error retrieving gallery image: {str(e)}"
        )


# --------------------------------------------------------------------------
# 4. SUBIR E INSERTAR IMAGEN (CORREGIDO Y BLINDADO)
# --------------------------------------------------------------------------
@router.post("/upload", response_model=models.GalleryImage, status_code=status.HTTP_201_CREATED)
async def upload_gallery_image(
    file: UploadFile = File(...),
    title: str = Form("Nueva Imagen"),
    description: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    db: Client = Depends(get_supabase)
):
    """
    Processes and uploads an image to Supabase Storage ('agro-images' bucket)
    and registers the entry in the `gallery_images` database table.
    """
    try:
        # 1. Leer los bytes del archivo cargado
        file_bytes = await file.read()
        
        # 2. Procesar y subir imagen a Supabase Storage
        public_url = process_and_upload_image(
            supabase_client=db,
            file_bytes=file_bytes,
            original_filename=file.filename,
            bucket_name=SUPABASE_BUCKET
        )
        
        # 3. Validación segura de UUID para evitar ValueError por cadenas vacías/inválidas
        uploaded_by_uuid = None
        if uploaded_by and uploaded_by.strip() not in ["", "undefined", "null"]:
            try:
                uploaded_by_uuid = UUID(uploaded_by.strip())
            except ValueError:
                uploaded_by_uuid = None

        # 4. Limpieza de datos
        clean_title = title.strip() if title and title.strip() else "Nueva Imagen"
        clean_desc = description.strip() if description and description.strip() else None

        image_create = models.GalleryImageCreate(
            title=clean_title,
            description=clean_desc,
            image_url=public_url,
            uploaded_by=uploaded_by_uuid
        )
        
        image_dict = prepare_data_for_supabase(image_create.model_dump())
        response = db.table("gallery_images").insert(image_dict).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Image was uploaded to storage, but database registration failed."
            )
            
        created_item = response.data[0]
        
        # 5. Inyectar el email del perfil si existe uploaded_by
        if created_item.get("uploaded_by"):
            prof = db.table("profiles").select("email").eq("id", str(created_item["uploaded_by"])).execute()
            if prof.data:
                created_item["uploaded_by_email"] = prof.data[0].get("email")

        return created_item

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en /upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Error procesando la solicitud de subida: {str(e)}"
        )


# --------------------------------------------------------------------------
# 5. ACTUALIZAR REGISTRO DE GALERÍA
# --------------------------------------------------------------------------
@router.put("/{image_id}", response_model=models.GalleryImage)
def update_gallery_image(image_id: UUID, image: models.GalleryImageUpdate, db: Client = Depends(get_supabase)):
    """
    Update details (like title or description) of a gallery image entry.
    """
    try:
        image_dict = prepare_data_for_supabase(image.model_dump(exclude_unset=True))
        
        # Si no hay datos que actualizar, retornar el actual
        if not image_dict:
            response = db.table("gallery_images").select("*, profiles(email)").eq("id", str(image_id)).execute()
            if not response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery image not found")
            
            item = response.data[0]
            profile = item.pop("profiles", None) or {}
            item["uploaded_by_email"] = profile.get("email")
            return item

        response = db.table("gallery_images").update(image_dict).eq("id", str(image_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Gallery image not found or update failed"
            )
        
        updated_item = response.data[0]
        if updated_item.get("uploaded_by"):
            prof = db.table("profiles").select("email").eq("id", str(updated_item["uploaded_by"])).execute()
            if prof.data:
                updated_item["uploaded_by_email"] = prof.data[0].get("email")

        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --------------------------------------------------------------------------
# 6. ELIMINAR IMAGEN Y ARCHIVO DEL BUCKET
# --------------------------------------------------------------------------
@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gallery_image(image_id: UUID, db: Client = Depends(get_supabase)):
    """
    Surgical deletion of a gallery image. Also identifies the image URL,
    and removes the file from Supabase Storage to prevent file leaking.
    """
    try:
        # Obtener el registro para extraer la URL del archivo
        response = db.table("gallery_images").select("*").eq("id", str(image_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Gallery image not found"
            )
        
        record = response.data[0]
        image_url = record.get("image_url")
        
        # Eliminar archivo de Supabase Storage
        if image_url and f"/{SUPABASE_BUCKET}/" in image_url:
            try:
                parts = image_url.split(f"/{SUPABASE_BUCKET}/")
                if len(parts) > 1:
                    storage_path = parts[1].split("?")[0]
                    db.storage.from_(SUPABASE_BUCKET).remove([storage_path])
            except Exception as storage_err:
                print(f"Warning: Failed to delete image file from storage: {str(storage_err)}")

        # Eliminar fila de la base de datos
        db.table("gallery_images").delete().eq("id", str(image_id)).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to delete gallery image: {str(e)}"
        )