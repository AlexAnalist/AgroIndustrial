import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DashboardAdmin() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('article');
    const [loading, setLoading] = useState(false);

    // Estados
    const [articleData, setArticleData] = useState({ title: '', summary: '', content: '', category: '' });
    const [articleImage, setArticleImage] = useState(null);

    const [videoData, setVideoData] = useState({ title: '', description: '', video_url: '', category: '' });
    const [videoThumbnail, setVideoThumbnail] = useState(null);

    const [galleryData, setGalleryData] = useState({ title: '', description: '' });
    const [galleryImage, setGalleryImage] = useState(null);

    if (!user) {
        return (
            <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 max-w-lg mx-auto shadow-xl">
                <p className="font-medium">Acceso restringido</p>
                <p className="text-sm text-slate-500 mt-1">Debes iniciar sesión para acceder al panel de administración.</p>
            </div>
        );
    }

    // Helper para limpiar el Slug correctamente
    const generateSlug = (text) => {
        return text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    };

    // 1️⃣ PUBLICAR ARTÍCULO
    const handleArticleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = '';

            if (articleImage) {
                const formData = new FormData();
                formData.append('file', articleImage);
                formData.append('title', articleData.title || 'Portada de artículo');
                formData.append('description', articleData.summary || 'Portada de artículo');

                // Envío seguro de variables del usuario
                if (user?.id) formData.append('uploaded_by', String(user.id));
                if (user?.email) formData.append('author_email', String(user.email));

                const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/gallery/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const errorData = await uploadRes.json().catch(() => null);
                    throw new Error(errorData?.detail || 'Error al subir la imagen de portada');
                }
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.image_url || '';
            }

            const payload = {
                title: articleData.title.trim(),
                summary: articleData.summary.trim() || articleData.title.trim(),
                content: articleData.content.trim(),
                category: articleData.category.trim() || 'General',
                slug: generateSlug(articleData.title),
                image_url: imageUrl,
                author_id: user?.id || null,
                author_email: user?.email || null,
            };

            const res = await fetch(`${import.meta.env.VITE_API_URL}/articles/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.detail || 'Error 400: Revisa que todos los campos requeridos estén completos.');
            }

            alert('Artículo publicado con éxito');
            setArticleData({ title: '', summary: '', content: '', category: '' });
            setArticleImage(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 2️⃣ PUBLICAR VIDEO
    const handleVideoSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let thumbnailUrl = '';

            if (videoThumbnail) {
                const formData = new FormData();
                formData.append('file', videoThumbnail);
                formData.append('title', videoData.title || 'Thumbnail de video');
                formData.append('description', 'Thumbnail de video');

                if (user?.id) formData.append('uploaded_by', String(user.id));
                if (user?.email) formData.append('author_email', String(user.email));

                const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/gallery/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const errorData = await uploadRes.json().catch(() => null);
                    throw new Error(errorData?.detail || 'Error al subir la miniatura del video');
                }
                const uploadData = await uploadRes.json();
                thumbnailUrl = uploadData.image_url || '';
            }

            const payload = {
                title: videoData.title.trim(),
                description: videoData.description.trim() || videoData.title.trim(),
                video_url: videoData.video_url.trim(),
                category: videoData.category.trim() || 'General',
                thumbnail_url: thumbnailUrl,
                created_by: user?.id || null,
                author_email: user?.email || null,
            };

            const res = await fetch(`${import.meta.env.VITE_API_URL}/videos/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.detail || 'Error al guardar el video');
            }

            alert('Video registrado con éxito');
            setVideoData({ title: '', description: '', video_url: '', category: '' });
            setVideoThumbnail(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 3️⃣ PUBLICAR GALERÍA
    const handleGallerySubmit = async (e) => {
        e.preventDefault();
        if (!galleryImage) return alert('Debes seleccionar un archivo de imagen');
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', galleryImage);
            formData.append('title', galleryData.title.trim() || 'Imagen sin título');
            formData.append('description', galleryData.description.trim() || galleryData.title.trim());

            if (user?.id) formData.append('uploaded_by', String(user.id));
            if (user?.email) formData.append('author_email', String(user.email));

            const res = await fetch(`${import.meta.env.VITE_API_URL}/gallery/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.detail || 'Error al procesar la imagen');
            }

            alert('Imagen subida a la galería con éxito');
            setGalleryData({ title: '', description: '' });
            setGalleryImage(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl max-w-3xl mx-auto text-slate-200">
            {/* Header del Panel */}
            <div className="mb-6 pb-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white tracking-wide">Panel de Administración</h2>
                <p className="text-xs text-slate-400 mt-1">Gestión y publicación de contenido multimedia</p>
            </div>

            {/* Pestañas de Navegación */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 mb-6">
                <button
                    onClick={() => setActiveTab('article')}
                    className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'article'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                >
                    Nuevo Artículo
                </button>
                <button
                    onClick={() => setActiveTab('video')}
                    className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'video'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                >
                    Enlazar Video
                </button>
                <button
                    onClick={() => setActiveTab('gallery')}
                    className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'gallery'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                >
                    Subir Imagen
                </button>
            </div>

            {/* FORMULARIO: ARTÍCULO */}
            {activeTab === 'article' && (
                <form onSubmit={handleArticleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Título del Artículo *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ingrese el título principal"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            value={articleData.title}
                            onChange={(e) => setArticleData({ ...articleData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Categoría
                            </label>
                            <input
                                type="text"
                                placeholder="Ej. Cultivos, Maquinaria"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                value={articleData.category}
                                onChange={(e) => setArticleData({ ...articleData, category: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Imagen de Portada
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setArticleImage(e.target.files[0])}
                                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Resumen Corto
                        </label>
                        <textarea
                            rows="2"
                            placeholder="Breve introducción o descripción"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                            value={articleData.summary}
                            onChange={(e) => setArticleData({ ...articleData, summary: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Contenido del Artículo *
                        </label>
                        <textarea
                            rows="6"
                            required
                            placeholder="Redacte el cuerpo completo del artículo..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            value={articleData.content}
                            onChange={(e) => setArticleData({ ...articleData, content: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Procesando...' : 'Publicar Artículo'}
                    </button>
                </form>
            )}

            {/* FORMULARIO: VIDEO */}
            {activeTab === 'video' && (
                <form onSubmit={handleVideoSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Título del Video *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ingrese el título del video"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            value={videoData.title}
                            onChange={(e) => setVideoData({ ...videoData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            URL del Video *
                        </label>
                        <input
                            type="url"
                            required
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            value={videoData.video_url}
                            onChange={(e) => setVideoData({ ...videoData, video_url: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Categoría
                            </label>
                            <input
                                type="text"
                                placeholder="Ej. Capacitación"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                value={videoData.category}
                                onChange={(e) => setVideoData({ ...videoData, category: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Miniatura / Thumbnail
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setVideoThumbnail(e.target.files[0])}
                                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Descripción
                        </label>
                        <textarea
                            rows="3"
                            placeholder="Descripción detallada del contenido del video"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                            value={videoData.description}
                            onChange={(e) => setVideoData({ ...videoData, description: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Procesando...' : 'Guardar Video'}
                    </button>
                </form>
            )}

            {/* FORMULARIO: GALERÍA DE IMÁGENES */}
            {activeTab === 'gallery' && (
                <form onSubmit={handleGallerySubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Título de la Imagen *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Nombre explicativo para la imagen"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            value={galleryData.title}
                            onChange={(e) => setGalleryData({ ...galleryData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Descripción
                        </label>
                        <textarea
                            rows="2"
                            placeholder="Detalles sobre la imagen"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                            value={galleryData.description}
                            onChange={(e) => setGalleryData({ ...galleryData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Archivo de Imagen *
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            required
                            onChange={(e) => setGalleryImage(e.target.files[0])}
                            className="w-full text-xs text-slate-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Subiendo Archivo...' : 'Subir a Galería'}
                    </button>
                </form>
            )}
        </div>
    );
}