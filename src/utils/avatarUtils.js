export const getSafePhotoURL = (value) => {
  if (typeof value !== 'string') return null;

  const url = value.trim();
  if (!url) return null;

  const lower = url.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'nan') return null;

  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(url)) return url;
  if (/^https?:\/\/\S+$/i.test(url)) return url;
  if (/^blob:\S+$/i.test(url)) return url;

  return null;
};
