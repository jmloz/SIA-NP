// Cliente de la API. Lanza Error con el mensaje del servidor para mostrarlo al usuario.
async function pedir(metodo, url, cuerpo) {
  const r = await fetch('/api' + url, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : {},
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    credentials: 'same-origin',
  });
  const datos = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) {
    const e = new Error(datos?.error || `Error ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return datos;
}

export const api = {
  get: (url) => pedir('GET', url),
  post: (url, cuerpo) => pedir('POST', url, cuerpo ?? {}),
  put: (url, cuerpo) => pedir('PUT', url, cuerpo ?? {}),
  del: (url) => pedir('DELETE', url),
};

/** Abre un PDF/Excel generado por el servidor en otra pestaña (usa la cookie de sesión). */
export function abrirDocumento(url) {
  window.open('/api' + url, '_blank');
}
