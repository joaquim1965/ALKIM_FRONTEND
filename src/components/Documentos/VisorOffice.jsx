import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { VentanaEmergente } from '../UI/ZonaArchivos';
import Button from '../UI/Button';
import { apiFetch, authHeaders } from '../../services/api';

/**
 * VisorOffice — ver un Word o un Excel dentro de la aplicación (15/10/2026).
 *
 * El navegador no sabe mostrar .docx ni .xlsx: los descarga. Aquí se piden
 * los bytes al backend (GET /files/:id/contenido, con permisos y auditoría)
 * y se convierten en el propio navegador; el documento no sale de la web.
 *   Word  (.docx)       → un .docx es un .zip con XML: se abre con el lector
 *                         de zip de SheetJS (ya instalado, sin librerías
 *                         nuevas) y se pasa a HTML aquí: párrafos, títulos,
 *                         negrita/cursiva/subrayado, listas, tablas e imágenes.
 *   Excel (.xlsx, .xls) → SheetJS: una pestaña por hoja.
 * Se pierde algo de formato fino (márgenes, encabezados de página); para el
 * formato exacto está «Descargar».
 */
export const EXT_VISOR_OFFICE = ['docx', 'xlsx', 'xls'];
export const esOffice = (a) => EXT_VISOR_OFFICE.includes(String(a?.extension || '').toLowerCase());

/** Quita lo que no debe ejecutarse: scripts, iframes, on* y enlaces javascript:. */
function limpiarHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, style, link, meta').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((n) => {
    [...n.attributes].forEach((at) => {
      const nombre = at.name.toLowerCase();
      const valor = String(at.value || '').trim().toLowerCase();
      if (nombre.startsWith('on')) n.removeAttribute(at.name);
      if ((nombre === 'href' || nombre === 'src') && valor.startsWith('javascript:')) n.removeAttribute(at.name);
    });
    if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
  });
  return doc.body.firstChild.innerHTML;
}

// ── Word (.docx) → HTML, sin librerías nuevas ──────────────────────────────
/** SheetJS: en el navegador llega como módulo ES; en otros entornos, en `default`. */
async function cargarXlsx() {
  const m = await import('xlsx');
  return m.CFB ? m : (m.default || m);
}
const escapar = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hijos = (el, nombre) => [...(el?.children || [])].filter((c) => c.localName === nombre);
const hijo = (el, nombre) => hijos(el, nombre)[0] || null;
const activo = (el) => el && !['0', 'false', 'none'].includes(String(el.getAttribute('w:val') ?? '').toLowerCase());
const MIME_IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

function aBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function docxAHtml(datos) {
  const XLSX = await cargarXlsx();
  const zip = XLSX.CFB.read(new Uint8Array(datos), { type: 'array' });
  const leer = (ruta) => {
    const e = XLSX.CFB.find(zip, `/${ruta}`);   // las rutas del zip empiezan por «/»
    return e?.content ? new Uint8Array(e.content) : null;
  };
  const texto = (ruta) => { const b = leer(ruta); return b ? new TextDecoder('utf-8').decode(b) : null; };
  const xml = texto('word/document.xml');
  if (!xml) throw new Error('No parece un documento de Word (.docx).');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // Imágenes: r:embed → word/_rels/document.xml.rels → word/media/…
  const rels = {};
  const relsXml = texto('word/_rels/document.xml.rels');
  if (relsXml) {
    for (const r of parser.parseFromString(relsXml, 'application/xml').getElementsByTagName('Relationship')) {
      rels[r.getAttribute('Id')] = r.getAttribute('Target');
    }
  }
  const imagen = (id) => {
    const destino = rels[id];
    if (!destino || /^https?:/i.test(destino)) return '';
    const ruta = destino.startsWith('/') ? destino.slice(1) : `word/${destino.replace(/^\.\//, '')}`;
    const bytes = leer(ruta);
    const ext = ruta.split('.').pop().toLowerCase();
    if (!bytes || !MIME_IMG[ext]) return '';
    return `<img src="data:${MIME_IMG[ext]};base64,${aBase64(bytes)}" alt="">`;
  };

  const run = (r) => {
    const pr = hijo(r, 'rPr');
    let out = '';
    for (const c of r.children) {
      if (c.localName === 't') out += escapar(c.textContent);
      else if (c.localName === 'tab') out += ' &nbsp; ';
      else if (c.localName === 'br' || c.localName === 'cr') out += '<br>';
      else if (c.localName === 'drawing' || c.localName === 'pict') {
        for (const b of c.getElementsByTagName('*')) {
          const id = b.getAttribute('r:embed') || b.getAttribute('r:id');
          if (id && (b.localName === 'blip' || b.localName === 'imagedata')) out += imagen(id);
        }
      }
    }
    if (!out) return '';
    if (activo(hijo(pr, 'b'))) out = `<strong>${out}</strong>`;
    if (activo(hijo(pr, 'i'))) out = `<em>${out}</em>`;
    if (activo(hijo(pr, 'u'))) out = `<u>${out}</u>`;
    return out;
  };
  const contenidoParrafo = (p) => [...p.children].map((c) => {
    if (c.localName === 'r') return run(c);
    if (['hyperlink', 'ins', 'smartTag', 'sdt', 'sdtContent', 'fldSimple'].includes(c.localName)) return contenidoParrafo(c);
    return '';
  }).join('');

  const salida = [];
  let lista = null;   // 'ul' abierta mientras siguen párrafos numerados
  const cerrarLista = () => { if (lista) { salida.push('</ul>'); lista = null; } };
  const parrafo = (p) => {
    const pPr = hijo(p, 'pPr');
    const estilo = String(hijo(pPr, 'pStyle')?.getAttribute('w:val') || '');
    const html = contenidoParrafo(p);
    const nivel = /^(heading|t[ií]tulo|titulo)\s*(\d)/i.exec(estilo)?.[2] || (/^title$/i.test(estilo) ? '1' : null);
    // Lista: numeración en el párrafo o un estilo de lista («List Bullet», «Lista con viñetas»…).
    if ((hijo(pPr, 'numPr') || /list|lista|vi[ñn]eta/i.test(estilo)) && !nivel) {
      if (!lista) { salida.push('<ul>'); lista = 'ul'; }
      salida.push(`<li>${html}</li>`);
      return;
    }
    cerrarLista();
    if (nivel) salida.push(`<h${Math.min(Number(nivel), 4)}>${html}</h${Math.min(Number(nivel), 4)}>`);
    else salida.push(html ? `<p>${html}</p>` : '<p>&nbsp;</p>');
  };
  const tabla = (t) => {
    cerrarLista();
    salida.push('<table>');
    for (const tr of hijos(t, 'tr')) {
      salida.push('<tr>');
      for (const tc of hijos(tr, 'tc')) {
        const span = hijo(hijo(tc, 'tcPr'), 'gridSpan')?.getAttribute('w:val');
        const celda = hijos(tc, 'p').map(contenidoParrafo).filter(Boolean).join('<br>');
        salida.push(`<td${span ? ` colspan="${Number(span) || 1}"` : ''}>${celda}</td>`);
      }
      salida.push('</tr>');
    }
    salida.push('</table>');
  };
  const recorrer = (el) => {
    for (const c of el.children) {
      if (c.localName === 'p') parrafo(c);
      else if (c.localName === 'tbl') tabla(c);
      else if (c.localName === 'sdt' || c.localName === 'sdtContent') recorrer(c);
    }
  };
  const cuerpo = doc.getElementsByTagName('w:body')[0];
  if (!cuerpo) throw new Error('No se ha podido leer el documento.');
  recorrer(cuerpo);
  cerrarLista();
  return salida.join('\n');
}

// Estilos del documento convertido, con los colores del tema.
const ESTILOS = `
.visor-office { line-height: 1.55; font-size: 0.95rem; }
.visor-office h1 { font-size: 1.5rem; font-weight: 900; margin: 1rem 0 .5rem; }
.visor-office h2 { font-size: 1.25rem; font-weight: 800; margin: 1rem 0 .5rem; }
.visor-office h3, .visor-office h4 { font-size: 1.05rem; font-weight: 800; margin: .75rem 0 .4rem; }
.visor-office p { margin: 0 0 .6rem; }
.visor-office ul { list-style: disc; padding-left: 1.5rem; margin: 0 0 .6rem; }
.visor-office ol { list-style: decimal; padding-left: 1.5rem; margin: 0 0 .6rem; }
.visor-office a { text-decoration: underline; }
.visor-office img { max-width: 100%; height: auto; margin: .5rem 0; }
.visor-office table { border-collapse: collapse; margin: .5rem 0 1rem; font-size: .85rem; }
.visor-office th, .visor-office td { border: 1px solid var(--color-border); padding: .3rem .5rem; vertical-align: top; white-space: pre-wrap; }
.visor-office tr:first-child td { font-weight: 700; }
/* Tablas del documento con los colores de tabla del tema (CRITERIOS_UI_LISTADOS). */
.visor-office tr { background: var(--color-table-row); color: var(--color-on-table-row); }
.visor-office tr:nth-child(even) { background: var(--color-table-row-striped); color: var(--color-on-table-row-striped); }
`;

export default function VisorOffice({ archivo, onCerrar, onDescargar, t = (k, f) => f }) {
  const [estado, setEstado] = useState({ cargando: true, error: '', html: '', hojas: [] });
  const [hoja, setHoja] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await apiFetch(`/files/${archivo.id}/contenido`, { headers: authHeaders() });
        if (!r.ok) {
          const cuerpo = await r.json().catch(() => ({}));
          throw new Error(cuerpo.message || `Error ${r.status}`);
        }
        const datos = await r.arrayBuffer();
        const ext = String(archivo.extension || '').toLowerCase();
        if (ext === 'docx') {
          const html = await docxAHtml(datos);
          if (vivo) setEstado({ cargando: false, error: '', html: limpiarHtml(html), hojas: [] });
        } else {
          const XLSX = await cargarXlsx();
          const libro = XLSX.read(datos, { type: 'array' });
          const hojas = libro.SheetNames.map((nombre) => ({
            nombre,
            html: limpiarHtml(XLSX.utils.sheet_to_html(libro.Sheets[nombre], { header: '', footer: '' })),
          }));
          if (vivo) setEstado({ cargando: false, error: '', html: '', hojas });
        }
      } catch (e) {
        if (vivo) setEstado({ cargando: false, error: e.message || String(e), html: '', hojas: [] });
      }
    })();
    return () => { vivo = false; };
  }, [archivo]);

  const contenido = estado.hojas.length ? estado.hojas[hoja]?.html : estado.html;

  return (
    <VentanaEmergente titulo={archivo.nombre_original || archivo.nombre} etiquetaCerrar={t('cerrar', 'Cerrar')} onCerrar={onCerrar} ancho="max-w-5xl" cerrarIzquierda>
      <style>{ESTILOS}</style>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {estado.hojas.length > 1 && estado.hojas.map((h, i) => (
            <Button key={h.nombre} type="button" size="sm" variant={i === hoja ? 'primary' : 'secondary'} onClick={() => setHoja(i)}>{h.nombre}</Button>
          ))}
          {onDescargar && (
            <Button type="button" size="sm" variant="secondary" leftIcon={<Download size={14} />} onClick={onDescargar} className="ml-auto">
              {t('descargar', 'Descargar')}
            </Button>
          )}
        </div>
        {estado.cargando && <p className="py-6 text-center text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</p>}
        {estado.error && <p className="rounded-lg border border-destructive-border bg-destructive px-3 py-2 text-sm text-on-destructive">{estado.error}</p>}
        {!estado.cargando && !estado.error && (
          contenido
            ? <div className="visor-office overflow-x-auto" dangerouslySetInnerHTML={{ __html: contenido }} />
            : <p className="py-6 text-center text-xs font-bold uppercase tracking-widest">{t('documento_vacio', 'El documento está vacío.')}</p>
        )}
      </div>
    </VentanaEmergente>
  );
}

/**
 * VistaOffice — el mismo Word / Excel convertido, pero SIN ventana: para meterlo
 * dentro de otra pantalla (pantalla completa de Comunicaciones, 27/10/2026).
 * Recibe los bytes ya traídos (`blob`), así no se piden otra vez al backend.
 */
export function VistaOffice({ blob, extension, t = (k, f) => f }) {
  const [estado, setEstado] = useState({ cargando: true, error: '', html: '', hojas: [] });
  const [hoja, setHoja] = useState(0);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const datos = await blob.arrayBuffer();
        if (String(extension || '').toLowerCase() === 'docx') {
          const html = await docxAHtml(datos);
          if (vivo) setEstado({ cargando: false, error: '', html: limpiarHtml(html), hojas: [] });
        } else {
          const XLSX = await cargarXlsx();
          const libro = XLSX.read(datos, { type: 'array' });
          const hojas = libro.SheetNames.map((nombre) => ({ nombre, html: limpiarHtml(XLSX.utils.sheet_to_html(libro.Sheets[nombre], { header: '', footer: '' })) }));
          if (vivo) setEstado({ cargando: false, error: '', html: '', hojas });
        }
      } catch (e) {
        if (vivo) setEstado({ cargando: false, error: e.message || String(e), html: '', hojas: [] });
      }
    })();
    return () => { vivo = false; };
  }, [blob, extension]);
  const contenido = estado.hojas.length ? estado.hojas[hoja]?.html : estado.html;
  return (
    <div className="space-y-3">
      <style>{ESTILOS}</style>
      {estado.hojas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {estado.hojas.map((h, i) => (
            <Button key={h.nombre} type="button" size="sm" variant={i === hoja ? 'primary' : 'secondary'} onClick={() => setHoja(i)}>{h.nombre}</Button>
          ))}
        </div>
      )}
      {estado.cargando && <p className="py-6 text-center text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</p>}
      {estado.error && <p className="rounded-lg border border-destructive-border bg-destructive px-3 py-2 text-sm text-on-destructive">{estado.error}</p>}
      {!estado.cargando && !estado.error && (contenido
        ? <div className="visor-office overflow-x-auto" dangerouslySetInnerHTML={{ __html: contenido }} />
        : <p className="py-6 text-center text-xs font-bold uppercase tracking-widest">{t('documento_vacio', 'El documento está vacío.')}</p>)}
    </div>
  );
}
