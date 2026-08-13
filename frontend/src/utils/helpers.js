/**
 * Extracts the default HD thumbnail URL from a YouTube or Vimeo URL using regular expressions.
 * Supports YouTube standard, shorts, youtu.be, embed, and Vimeo URLs.
 *
 * @param {string} videoUrl
 * @returns {string|null}
 */
export function extractVideoThumbnail(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return null;

  // YouTube regex
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/;
  const ytMatch = videoUrl.match(youtubeRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  // Vimeo regex
  const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]+\/videos\/|video\/|)(\d+)/;
  const vimeoMatch = videoUrl.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return `https://vumbnail.com/${videoId}.jpg`;
  }

  return null;
}

/**
 * Formats an email address (e.g. juan.perez@unet.edu.ve) into a legible author name (e.g. Juan Perez).
 *
 * @param {string} email
 * @returns {string}
 */
export function formatAuthor(email) {
  if (!email || typeof email !== 'string') return 'Autor Institucional';

  // 1. Extraer la parte anterior al @
  const username = email.split('@')[0];
  if (!username) return 'Autor Institucional';

  // 2. Reemplazar puntos por espacios y capitalizar cada palabra
  return username
    .split('.')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
