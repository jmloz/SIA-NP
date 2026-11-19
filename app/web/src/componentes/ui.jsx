// Componentes comunes con el estilo de las maquetas (entregable 9).

export function Logo({ claro = false }) {
  return (
    <span className="logo">
      <svg viewBox="0 0 34 34" width="30" height="30" aria-hidden="true">
        <rect className="fondo" x="1" y="1" width="32" height="32" rx="8" fill="#ffffff" opacity=".16" />
        <rect className="caja" x="7" y="10" width="20" height="15" rx="1.5" fill="none" stroke={claro ? '#4f46e5' : '#fff'} strokeWidth="2" />
        <path d="M7 15 h20 M14 10 v5 M20 10 v5" stroke={claro ? '#4f46e5' : '#fff'} strokeWidth="2" fill="none" />
      </svg>
      <span className="logo-txt"><b>SIA-NP</b><small>Neumática del Pacífico</small></span>
    </span>
  );
}

/** Tarjeta de pantalla. id = identificador de interfaz (IE-002) o de salida (S6); pie = descripción. */
export function Pantalla({ titulo, intro, id, pie, children }) {
  return (
    <section className="pantalla">
      {titulo && <div className="pantalla-tit">{titulo}</div>}
      <div className="cuerpo">
        {intro && <div className="intro">{intro}</div>}
        {children}
      </div>
      {(id || pie) && <div className="pie">{id && <span className="id-chip">{id}</span>}{pie}</div>}
    </section>
  );
}

export function Seccion({ titulo, accion, children }) {
  return (
    <div className="seccion">
      <div className="seccion-tit"><span>{titulo}</span>{accion}</div>
      {children}
    </div>
  );
}

/** Campo con etiqueta, marca de obligatorio y texto de validación (hint) o de error. */
export function Campo({ etiqueta, req, hint, error, full, children }) {
  return (
    <div className={`campo${full ? ' full' : ''}${error ? ' error' : ''}`}>
      <label>{etiqueta}{req && <span className="req">*</span>}</label>
      {children}
      {error ? <div className="hint err">✗ {error}</div> : hint && <div className="hint"><span className="v">✓</span>{hint}</div>}
    </div>
  );
}

/** Mensaje: tipo ok | error | aviso | info. */
export function Alerta({ tipo = 'info', children }) {
  if (!children) return null;
  return <div className={`alerta ${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Botones({ children }) {
  return <div className="barra-btn">{children}</div>;
}

/** Formato de cantidades y dinero en es-MX. */
export const fmt = {
  num: (n, d = 2) => (n == null ? '' : Number(n).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })),
  dinero: (n) => (n == null ? '' : Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })),
  fecha: (f) => (f ? new Date(f).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : ''),
  fechaHora: (f) => (f ? new Date(f).toLocaleString('es-MX', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }) : ''),
};
