const clean = value => (value || '').trim().replace(/\/$/, '');

export function sanitizeFileName(name = 'photo.jpg') {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'photo';
  return `${base}${ext || '.jpg'}`;
}

function authHeaders(anonKey) {
  return { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
}

export async function uploadOriginalPhoto({ file, siteId, workDate, settings }) {
  const url = clean(settings.supabaseUrl);
  const anonKey = clean(settings.supabaseAnonKey);
  if (!url || !anonKey) throw new Error('SUPABASE_NOT_CONFIGURED');

  const bucket = settings.storageBucket || 'marketing-originals';
  const safeName = sanitizeFileName(file.name);
  const path = `${workDate || 'undated'}/${siteId}/${crypto.randomUUID()}-${safeName}`;
  const endpoint = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...authHeaders(anonKey),
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
      'cache-control': '3600',
    },
    body: file,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Upload failed (${response.status})`);
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    caption: '',
    url: `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
    storagePath: path,
    bucket,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    uploadedAt: new Date().toISOString(),
    storage: 'supabase-original',
  };
}

export async function deleteOriginalPhoto(photo, settings) {
  if (!photo?.storagePath) return;
  const url = clean(settings.supabaseUrl);
  const anonKey = clean(settings.supabaseAnonKey);
  if (!url || !anonKey) return;
  const bucket = photo.bucket || settings.storageBucket || 'marketing-originals';
  const endpoint = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${photo.storagePath.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(endpoint, { method: 'DELETE', headers: authHeaders(anonKey) });
  if (!response.ok) throw new Error((await response.text()) || `Delete failed (${response.status})`);
}
