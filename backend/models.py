from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

# ==========================================
# 1. PROFILE SCHEMAS (profiles table)
# ==========================================
class ProfileBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None

class ProfileCreate(ProfileBase):
    id: UUID  # Typically matches auth.users.id

class ProfileUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None

class Profile(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. ARTICLE SCHEMAS (articles table)
# ==========================================
class ArticleBase(BaseModel):
    title: str
    slug: str
    summary: Optional[str] = None
    content: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    author_id: Optional[UUID] = None
    published_at: Optional[datetime] = None

class ArticleCreate(ArticleBase):
    pass

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    author_id: Optional[UUID] = None
    published_at: Optional[datetime] = None

class Article(ArticleBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. VIDEO SCHEMAS (videos table)
# ==========================================
class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    created_by: Optional[UUID] = None
   
class VideoCreate(VideoBase):
    pass

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    created_by: Optional[UUID] = None
  
class Video(VideoBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 4. GALLERY SCHEMAS (gallery_images table)
# ==========================================
class GalleryImageBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    uploaded_by: Optional[UUID] = None
   

class GalleryImageCreate(GalleryImageBase):
    pass

class GalleryImageUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    uploaded_by: Optional[UUID] = None
   

class GalleryImage(GalleryImageBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)