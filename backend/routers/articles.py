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

router = APIRouter(prefix="/api/articles", tags=["Articles"])


@router.post("/", response_model=models.Article, status_code=status.HTTP_201_CREATED)
def create_article(article: models.ArticleCreate, db: Client = Depends(get_supabase)):
    """
    Crea un nuevo artículo y obtiene los datos del autor desde la tabla profiles.
    """
    try:
        article_dict = prepare_data_for_supabase(article.model_dump())
        response = db.table("articles").insert(article_dict).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al crear el artículo en Supabase."
            )

        created_item = response.data[0]

        # Inyectamos email y full_name desde profiles usando author_id
        if created_item.get("author_id"):
            prof = db.table("profiles").select("email, full_name").eq("id", str(created_item["author_id"])).execute()
            if prof.data:
                created_item["author_email"] = prof.data[0].get("email")
                created_item["author_name"] = prof.data[0].get("full_name") or prof.data[0].get("email")

        return created_item
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[models.Article])
def get_articles(db: Client = Depends(get_supabase)):
    """
    Obtiene todos los artículos ordenados por fecha, adjuntando email y nombre completo del autor.
    """
    try:
        # Consulta relacional con JOIN en Supabase
        response = db.table("articles").select("*, profiles(email, full_name)").order("created_at", desc=True).execute()

        articles = []
        for item in response.data:
            # Extraemos los datos de la relación profiles
            profile = item.pop("profiles", None) or {}
            item["author_email"] = profile.get("email")
            item["author_name"] = profile.get("full_name") or profile.get("email") or "Anónimo"
            articles.append(item)

        return articles
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener artículos: {str(e)}"
        )


@router.get("/{article_id}", response_model=models.Article)
def get_article(article_id: UUID, db: Client = Depends(get_supabase)):
    """
    Obtiene un artículo por ID incluyendo el email y nombre del autor.
    """
    try:
        response = db.table("articles").select("*, profiles(email, full_name)").eq("id", str(article_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artículo no encontrado"
            )

        item = response.data[0]
        profile = item.pop("profiles", None) or {}
        item["author_email"] = profile.get("email")
        item["author_name"] = profile.get("full_name") or profile.get("email") or "Anónimo"

        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al recuperar el artículo: {str(e)}"
        )


@router.put("/{article_id}", response_model=models.Article)
def update_article(article_id: UUID, article: models.ArticleUpdate, db: Client = Depends(get_supabase)):
    """
    Actualiza los campos de un artículo y devuelve los datos enriquecidos con el autor.
    """
    try:
        article_dict = prepare_data_for_supabase(article.model_dump(exclude_unset=True))

        # Si no hay campos a actualizar, devolvemos el artículo actual
        if not article_dict:
            response = db.table("articles").select("*, profiles(email, full_name)").eq("id", str(article_id)).execute()
            if not response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artículo no encontrado")

            item = response.data[0]
            profile = item.pop("profiles", None) or {}
            item["author_email"] = profile.get("email")
            item["author_name"] = profile.get("full_name") or profile.get("email") or "Anónimo"
            return item

        response = db.table("articles").update(article_dict).eq("id", str(article_id)).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artículo no encontrado o la actualización falló"
            )

        updated_item = response.data[0]
        if updated_item.get("author_id"):
            prof = db.table("profiles").select("email, full_name").eq("id", str(updated_item["author_id"])).execute()
            if prof.data:
                updated_item["author_email"] = prof.data[0].get("email")
                updated_item["author_name"] = prof.data[0].get("full_name") or prof.data[0].get("email")

        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(article_id: UUID, db: Client = Depends(get_supabase)):
    """
    Elimina un artículo por su ID.
    """
    try:
        exists_check = db.table("articles").select("id").eq("id", str(article_id)).execute()
        if not exists_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artículo no encontrado"
            )

        db.table("articles").delete().eq("id", str(article_id)).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar el artículo: {str(e)}"
        )