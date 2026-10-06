/**
 * CampoFecha — campo de fecha ESTÁNDAR de la aplicación (06/10/2026).
 *
 * Sustituye a <input type="date"> y <input type="month"> en todas las pantallas:
 *   - Sin el icono del calendario: es un campo de texto «dd/mm/aaaa» («mm/aaaa» con `mes`).
 *   - Se puede escribir o PEGAR solo los números: «03102026» → «03/10/2026»; las barras
 *     se ponen solas al escribir. También admite «3/10/2026», «3.10.26», «03-10-2026»
 *     y «2026-10-03».
 *   - Hacia fuera funciona igual que el input nativo: `value` y el `onChange` reciben
 *     la fecha en formato ISO «AAAA-MM-DD» («AAAA-MM» con `mes»), o '' si está vacía,
 *     en `evento.target.value` (y `evento.target.name`). Mientras la fecha está a medio
 *     escribir no se avisa; si no es válida (31/02) o se sale de `min`/`max`, el
 *     formulario no se envía y el navegador dice por qué.
 *
 * Uso: <CampoFecha value={f.fecha} onChange={(e) => setF({ fecha: e.target.value })} className={CLASE_INPUT} />
 */
import React, { useEffect, useRef, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
const anyoCompleto = (a) => (String(a).length === 2 ? 2000 + Number(a) : Number(a));

/** ISO → texto en pantalla. */
function aTexto(iso, mes) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return String(iso);
  return mes ? `${m[2]}/${m[1]}` : `${m[3] || '01'}/${m[2]}/${m[1]}`;
}

/** Lo escrito → texto con barras (mientras se escribe). */
function formatear(bruto, mes) {
  const s = String(bruto).trim();
  // Pegado con separadores o en ISO: se normaliza entero.
  const iso = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (iso) return mes ? `${pad(iso[2])}/${iso[1]}` : `${pad(iso[3] || 1)}/${pad(iso[2])}/${iso[1]}`;
  const sep = mes ? s.match(/^(\d{1,2})[/.\-\s](\d{2}|\d{4})$/) : s.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})$/);
  if (sep) return mes ? `${pad(sep[1])}/${anyoCompleto(sep[2])}` : `${pad(sep[1])}/${pad(sep[2])}/${sep[3].length === 2 ? anyoCompleto(sep[3]) : sep[3]}`;
  // Escribiendo con separador tras una sola cifra («3/» → «03»), luego solo números: «03102026» → «03/10/2026».
  const partes = s.split(/[/.\-\s]+/);
  const d = partes.map((x, i) => (i < partes.length - 1 && x.length === 1 ? `0${x}` : x)).join('').replace(/\D/g, '').slice(0, mes ? 6 : 8);
  if (mes) return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  return d.slice(0, 2) + (d.length > 2 ? `/${d.slice(2, 4)}` : '') + (d.length > 4 ? `/${d.slice(4)}` : '');
}

/** Texto completo → ISO, o null si no es una fecha (o está a medias). `corto`: admite año de 2 cifras (al salir del campo). */
function aIso(texto, mes, corto = true) {
  const A = corto ? '(\\d{2}|\\d{4})' : '(\\d{4})';
  if (mes) {
    const m = texto.match(new RegExp(`^(\\d{2})\\/${A}$`));
    if (!m) return null;
    const mm = Number(m[1]); const a = anyoCompleto(m[2]);
    return mm >= 1 && mm <= 12 && a >= 1900 && a <= 2200 ? `${a}-${pad(mm)}` : null;
  }
  const m = texto.match(new RegExp(`^(\\d{2})\\/(\\d{2})\\/${A}$`));
  if (!m) return null;
  const dd = Number(m[1]); const mm = Number(m[2]); const a = anyoCompleto(m[3]);
  const f = new Date(Date.UTC(a, mm - 1, dd));
  if (a < 1900 || a > 2200 || f.getUTCMonth() !== mm - 1 || f.getUTCDate() !== dd) return null;
  return `${a}-${pad(mm)}-${pad(dd)}`;
}

export default function CampoFecha({
  value = '', onChange, name, mes = false, min, max, required = false, disabled = false,
  className = '', placeholder, onBlur, ...resto
}) {
  const [texto, setTexto] = useState(() => aTexto(value, mes));
  const emitido = useRef(value || '');
  const ref = useRef(null);

  // Si la fecha cambia desde fuera (cargar un registro, «hoy»…), se enseña.
  useEffect(() => {
    if ((value || '') !== emitido.current) {
      emitido.current = value || '';
      setTexto(aTexto(value, mes));
    }
  }, [value, mes]);

  const emitir = (iso) => {
    if (iso === emitido.current) return;
    emitido.current = iso;
    onChange?.({ target: { name, value: iso }, currentTarget: { name, value: iso } });
  };

  const validar = (t, iso) => {
    const el = ref.current;
    if (!el) return;
    let msg = '';
    if (t && !iso) msg = mes ? 'Escribe el mes como mm/aaaa.' : 'Escribe una fecha válida: dd/mm/aaaa.';
    else if (iso && min && iso < String(min).slice(0, iso.length)) msg = `La fecha no puede ser anterior a ${aTexto(min, mes)}.`;
    else if (iso && max && iso > String(max).slice(0, iso.length)) msg = `La fecha no puede ser posterior a ${aTexto(max, mes)}.`;
    el.setCustomValidity(msg);
  };

  const cambiar = (e) => {
    const t = formatear(e.target.value, mes);
    setTexto(t);
    const iso = aIso(t, mes, false);   // mientras se escribe, solo con el año entero
    if (iso || !t) validar(t, iso); else ref.current?.setCustomValidity('');
    if (iso) emitir(iso);
    else if (!t) emitir('');
  };

  const salir = (e) => {
    // Al salir: año de 2 cifras → 4; a medio escribir → se avisa al enviar.
    const iso = aIso(texto, mes);
    if (iso) setTexto(aTexto(iso, mes));
    else if (texto) emitir('');
    validar(texto, iso);
    onBlur?.(e);
  };

  return (
    <input
      ref={ref} type="text" inputMode="numeric" autoComplete="off" name={name}
      value={texto} onChange={cambiar} onBlur={salir} required={required} disabled={disabled}
      placeholder={placeholder ?? (mes ? 'mm/aaaa' : 'dd/mm/aaaa')} maxLength={mes ? 7 : 10}
      className={`${className} ${mes ? 'min-w-[7.5rem]' : 'min-w-[9.5rem]'}`} {...resto}   // ancho para «dd/mm/aaaa» entero
    />
  );
}

export { formatear, aIso, aTexto };
