import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import DashboardAdmin from './components/DashboardAdmin';
import ResetPassword from './components/ResetPassword';
import logoImage from './assets/logo.jpeg';
// Importamos el cliente de supabase del frontend si existe en tu proyecto
import { supabase } from './supabase/client';

// 🛠️ HELPER CORREGIDO: Formatear nombre de autor correctamente
const formatAuthorName = (itemOrEmail) => {
  if (!itemOrEmail) return 'Autor Institucional';

  let emailOrUser = null;

  // 1. Si pasaron un string directamente
  if (typeof itemOrEmail === 'string') {
    emailOrUser = itemOrEmail;
  }
  // 2. Si pasaron un objeto, buscar en todas las propiedades posibles de la API/Supabase
  else if (typeof itemOrEmail === 'object') {
    emailOrUser =
      itemOrEmail.author_email ||
      itemOrEmail.uploaded_by_email ||
      itemOrEmail.created_by_email ||
      itemOrEmail.user_email ||
      itemOrEmail.email ||
      itemOrEmail.author_name ||
      itemOrEmail.author ||
      itemOrEmail.uploaded_by ||
      itemOrEmail.created_by ||
      itemOrEmail.user?.email ||
      itemOrEmail.user?.username;
  }

  if (!emailOrUser || typeof emailOrUser !== 'string') return 'Autor Institucional';

  // REGEX para detectar si es un UUID (ej: 593dd5a6-dad8-4f0e-8824-ac30160081a8)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emailOrUser.replace(/\s+/g, ''));
  if (isUUID) return 'Autor Institucional';

  // Si no contiene '@' y parece un ID/Hash largo sin espacios, mostrar por defecto
  if (!emailOrUser.includes('@') && emailOrUser.length > 20 && !emailOrUser.includes(' ')) {
    return 'Autor Institucional';
  }

  // Extraer el nombre antes del @
  let username = emailOrUser;
  if (emailOrUser.includes('@')) {
    username = emailOrUser.split('@')[0];
  }

  if (!username) return 'Autor Institucional';

  // Reemplazar puntos, guiones y guiones bajos por espacios, y capitalizar cada palabra
  return username
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// 🛠️ HELPER: Extraer miniatura automática de YouTube si no subieron una personalizada
const getVideoThumbnail = (item) => {
  if (item.thumbnail_url) return item.thumbnail_url;

  if (item.video_url) {
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
    const match = item.video_url.match(regExp);

    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }

  return 'https://images.unsplash.com/photo-1595838729986-19293a2be187?q=80&w=600&auto=format&fit=crop';
};

// 🛠️ COMPONENTE AUXILIAR QUIRÚRGICO: Tarjeta de Video con descripción expandible
const VideoCardItem = ({ item, isOwner, handleDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const videoThumb = getVideoThumbnail(item);
  const descriptionText = item.description || '';
  const isLong = descriptionText.length > 100;

  return (
    <div className="bg-white border border-emerald-100/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
      <div>
        <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
          <img
            src={videoThumb}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {item.category && (
            <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
              🎬 {item.category}
            </span>
          )}
        </div>

        <div className="p-6 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
            {isOwner(item) && (
              <button
                onClick={() => handleDelete('videos', item.id)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-all"
                title="Eliminar mi vídeo"
              >
                🗑️
              </button>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-slate-600 text-sm leading-relaxed">
              {expanded || !isLong ? descriptionText : `${descriptionText.substring(0, 100)}...`}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer focus:outline-none"
              >
                {expanded ? '▲ Mostrar menos' : '📖 Leer descripción completa'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 space-y-3">
        <a
          href={item.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-sm py-2.5 px-4 rounded-xl transition-all border border-emerald-200"
        >
          ▶️ Ver Multimedia
        </a>
        <div className="text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
          <span>
            👤 Publicado por: <strong className="text-slate-700">{formatAuthorName(item)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

function MainApp() {
  const { user, signOut, isRecoveringPassword, setIsRecoveringPassword } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState('articles'); // 'articles' | 'videos' | 'gallery'

  // MODALES DE IMAGEN Y LECTURA DE ARTÍCULO COMPLETO
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Estados para los datos del Feed público
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Escuchar el estado de recuperación del contexto
  useEffect(() => {
    if (isRecoveringPassword) {
      setIsResetPasswordOpen(true);
    }
  }, [isRecoveringPassword]);

  // Cargar información pública al iniciar
  useEffect(() => {
    fetchFeedData();
  }, [user]); // Re-evaluar si el usuario cambia para actualizar estado del owner/emails

  const fetchFeedData = async () => {
    setLoadingFeed(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';

      const [resArticles, resVideos, resGallery] = await Promise.all([
        fetch(`${apiUrl}/articles/`).catch(() => null),
        fetch(`${apiUrl}/videos/`).catch(() => null),
        fetch(`${apiUrl}/gallery/`).catch(() => null)
      ]);

      const rawArticles = resArticles && resArticles.ok ? await resArticles.json() : [];
      const rawVideos = resVideos && resVideos.ok ? await resVideos.json() : [];
      const rawGallery = resGallery && resGallery.ok ? await resGallery.json() : [];

      // 1. Extraer los IDs únicos de autores/creadores de TODO el repositorio
      const allUserIds = [...new Set([
        ...rawArticles.map(a => a.created_by || a.uploaded_by || a.author_id),
        ...rawVideos.map(v => v.created_by || v.uploaded_by || v.author_id),
        ...rawGallery.map(g => g.created_by || g.uploaded_by || g.author_id)
      ].filter(Boolean))];

      let profileMap = {};

      // 2. Traer perfiles desde Supabase en el Front en una sola consulta global
      if (allUserIds.length > 0 && typeof supabase !== 'undefined' && supabase) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', allUserIds);

          if (profiles) {
            profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.email]));
          }
        } catch (e) {
          console.warn('No se pudieron consultar los perfiles desde Supabase client:', e);
        }
      }

      // 🛠️ HELPER INTERNO PARA ASIGNAR EMAIL CORRESPONDIENTE
      const enrichItemWithEmail = (item) => {
        const creatorId = item.created_by || item.uploaded_by || item.author_id;
        let email = profileMap[creatorId] || item.created_by_email || item.author_email || item.uploaded_by_email;

        // Respaldo: si coincide con el usuario actualmente autenticado
        if (!email && user && (creatorId === user.id)) {
          email = user.email;
        }

        return {
          ...item,
          created_by_email: email,
          author_email: email,
          uploaded_by_email: email
        };
      };

      // 3. Enriquecer los tres estados
      setArticles(rawArticles.map(enrichItemWithEmail));
      setVideos(rawVideos.map(enrichItemWithEmail));
      setGallery(rawGallery.map(enrichItemWithEmail));

    } catch (err) {
      console.error('Error cargando el feed público:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  // Función para ELIMINAR una publicación (solo el autor)
  const handleDelete = async (endpoint, id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/${endpoint}/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (endpoint === 'articles') setArticles(articles.filter((item) => item.id !== id));
        if (endpoint === 'videos') setVideos(videos.filter((item) => item.id !== id));
        if (endpoint === 'gallery') setGallery(gallery.filter((item) => item.id !== id));
      } else {
        alert('No se pudo eliminar la publicación.');
      }
    } catch (err) {
      console.error('Error eliminando la publicación:', err);
      alert('Ocurrió un error al intentar eliminar.');
    }
  };

  // Helper para comprobar si la publicación le pertenece al usuario actual
  const isOwner = (item) => {
    if (!user) return false;
    return (
      item.uploaded_by === user.id ||
      item.created_by === user.id ||
      item.author_id === user.id ||
      item.author_email === user.email ||
      item.uploaded_by_email === user.email ||
      item.created_by_email === user.email
    );
  };

  // Helper para agrupar elementos por categoría (Carpetas)
  const groupByCategory = (items) => {
    return items.reduce((acc, item) => {
      const cat = item.category?.trim() || 'Sin Categoría';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  };

  // Renderizador de Feed Dinámico con soporte de Carpetas/Categorías
  const renderCategorizedFeed = (items, type) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-16 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200">
          <span className="text-4xl block mb-2">🌿</span>
          <p className="text-emerald-800 font-medium">No hay contenido disponible en esta sección aún.</p>
        </div>
      );
    }

    const grouped = groupByCategory(items);
    const categories = Object.keys(grouped);
    const hasMultipleCategories = categories.length > 1 || (categories.length === 1 && categories[0] !== 'Sin Categoría');

    if (!hasMultipleCategories) {
      return renderGrid(items, type);
    }

    return (
      <div className="space-y-12">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
              <div className="bg-emerald-100 text-emerald-800 p-2 rounded-lg">📁</div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950 capitalize">{category}</h3>
                <p className="text-xs text-emerald-600">{categoryItems.length} elemento(s) publicado(s)</p>
              </div>
            </div>
            {renderGrid(categoryItems, type)}
          </div>
        ))}
      </div>
    );
  };

  // Grid de Renderizado por Tipo
  const renderGrid = (items, type) => {
    if (type === 'articles') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <article key={item.id} className="bg-white border border-emerald-100/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between relative group">
              <div>
                {item.image_url && (
                  <div
                    className="relative cursor-pointer overflow-hidden group/img"
                    onClick={() => setSelectedImage(item.image_url)}
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-48 object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold backdrop-blur-[1px]">
                      🔍 Ampliar imagen
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    {item.category && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        🌱 {item.category}
                      </span>
                    )}
                    {isOwner(item) && (
                      <button
                        onClick={() => handleDelete('articles', item.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-all"
                        title="Eliminar mi artículo"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 leading-snug">{item.title}</h3>
                  <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{item.summary || item.content}</p>

                  <button
                    onClick={() => setSelectedArticle(item)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 pt-1 hover:underline cursor-pointer"
                  >
                    📖 Leer entrada completa →
                  </button>
                </div>
              </div>

              <div className="px-6 pb-4 pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  👤 Publicado por: <strong className="text-slate-700">{formatAuthorName(item)}</strong>
                </span>
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (type === 'videos') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <VideoCardItem key={item.id} item={item} isOwner={isOwner} handleDelete={handleDelete} />
          ))}
        </div>
      );
    }

    if (type === 'gallery') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative bg-slate-100 border border-emerald-100 rounded-2xl overflow-hidden aspect-square shadow-sm cursor-pointer"
              onClick={() => setSelectedImage(item.image_url)}
            >
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

              {isOwner(item) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete('gallery', item.id);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700 z-10"
                  title="Eliminar foto"
                >
                  🗑️
                </button>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                {item.description && <p className="text-xs text-emerald-100">{item.description}</p>}
                <span className="text-[10px] text-emerald-200 mt-1">
                  📷 {formatAuthorName(item)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* BARRA DE NAVEGACIÓN INSTITUCIONAL */}
      <header className="border-b border-emerald-100 bg-white/90 backdrop-blur sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-0.5 rounded-xl shadow-sm flex items-center justify-center border border-gray-100">
              <img
                src={logoImage}
                alt="Logo AgroIndustrial"
                className="h-10 w-auto object-contain rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-emerald-950 tracking-tight leading-tight">AgroIndustrial</h1>
              <p className="text-xs text-emerald-600 font-medium">Repositorio Digital Universitario</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all"
                >
                  ⚙️ Panel de Gestión
                </button>
                <div className="h-6 w-px bg-slate-200"></div>
                <button
                  onClick={signOut}
                  className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-100 transition-all"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-700/20 transition-all"
              >
                Acceso Institucional
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <span className="bg-emerald-700/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
              Ingeniería Agroindustrial
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white">Guía Dinámica</h2>
            <p className="text-emerald-100/90 text-sm leading-relaxed">
              Explora artículos científicos, material técnico audiovisual y memoria fotográfica de nuestros proyectos y procesos agroindustriales.
            </p>
          </div>
          <div className="absolute -right-8 -bottom-10 text-9xl opacity-10 select-none pointer-events-none">
            🌱
          </div>
        </section>

        {/* FEED PÚBLICO SELECCIONABLE */}
        <section>
          <div className="flex justify-center border-b border-emerald-100 mb-8 gap-2 bg-white p-1.5 rounded-2xl shadow-sm border">
            <button
              onClick={() => setActiveSegment('articles')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeSegment === 'articles'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50/50'
                }`}
            >
              Artículos ({articles.length})
            </button>
            <button
              onClick={() => setActiveSegment('videos')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeSegment === 'videos'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50/50'
                }`}
            >
              Vídeos ({videos.length})
            </button>
            <button
              onClick={() => setActiveSegment('gallery')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeSegment === 'gallery'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50/50'
                }`}
            >
              Galería ({gallery.length})
            </button>
          </div>

          {loadingFeed ? (
            <div className="text-center py-16 text-emerald-800 font-medium animate-pulse">
              Cargando repositorio agroindustrial...
            </div>
          ) : (
            <>
              {activeSegment === 'articles' && renderCategorizedFeed(articles, 'articles')}
              {activeSegment === 'videos' && renderCategorizedFeed(videos, 'videos')}
              {activeSegment === 'gallery' && renderCategorizedFeed(gallery, 'gallery')}
            </>
          )}
        </section>
      </main>

      {/* MODAL PARA AMPLIAR IMÁGENES DE ARTÍCULO Y GALERÍA */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20">
            <img src={selectedImage} alt="Vista ampliada" className="max-w-full max-h-[85vh] object-contain mx-auto" />
            <button
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/90 font-bold text-sm border border-white/30"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARA VER ENTRADA COMPLETA DEL ARTÍCULO */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 relative shadow-2xl border border-emerald-100 flex flex-col">
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>

            {selectedArticle.image_url && (
              <img
                src={selectedArticle.image_url}
                alt={selectedArticle.title}
                className="w-full h-64 object-cover rounded-2xl mb-6 cursor-pointer border border-emerald-100"
                onClick={() => setSelectedImage(selectedArticle.image_url)}
              />
            )}

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                🌱 {selectedArticle.category || 'General'}
              </span>
              <span className="text-xs text-slate-500">
                👤 {formatAuthorName(selectedArticle)}
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-3 leading-snug">{selectedArticle.title}</h2>

            {selectedArticle.summary && (
              <p className="text-slate-600 italic text-sm mb-6 border-l-4 border-emerald-600 pl-4 py-1 bg-emerald-50/50 rounded-r-xl">
                {selectedArticle.summary}
              </p>
            )}

            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-4">
              {selectedArticle.content}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA RESTABLECER CONTRASEÑA */}
      {isResetPasswordOpen && (
        <ResetPassword
          onSuccess={() => {
            setIsResetPasswordOpen(false);
            setIsRecoveringPassword(false);
            window.history.replaceState(null, '', window.location.pathname);
          }}
        />
      )}

      {/* MODAL DEL DASHBOARD DE ADMINISTRACIÓN */}
      {isAdminOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100 flex flex-col">
            <div className="p-5 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50 sticky top-0 z-10 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-lg font-extrabold text-emerald-950">Panel de Gestión Agroindustrial</h3>
              </div>
              <button
                onClick={() => setIsAdminOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <DashboardAdmin onPublishSuccess={fetchFeedData} />
            </div>
          </div>
        </div>
      )}

      {/* Modal para autenticarse */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}