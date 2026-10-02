/**
 * utils/format.js
 *
 * Formato compartido de importes y fechas de saldo bancario.
 *
 * Vive aquí y no en cada pantalla porque el saldo aparece en tres sitios
 * (Conta → Bancos, Tesorería → Extractos y el modal de sincronización) y
 * tienen que verse idénticos.
 */

/**
 * Norma del proyecto: **los millares van siempre separados por punto.**
 *
 * `useGrouping: 'always'` no es un adorno. El valor por omisión de `Intl` en
 * español es `'auto'`, que aplica la regla tipográfica de agrupar solo a partir
 * de cinco dígitos: `18.486` llevaba punto y `4538` no. En una columna de
 * saldos, uno al lado del otro, eso se lee como dos formatos distintos y obliga
 * a contar los dígitos para comparar dos cifras (23/08/2026).
 */
const NUMERO_ES = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: 'always',
});

const NUMERO_ES_DECIMALES = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

/**
 * Importe con dos decimales y punto de millares: `1.234,56€`.
 *
 * Para movimientos y cuotas, donde los céntimos importan. Para saldos de
 * cabecera está `formatSaldo`, que los redondea.
 */
export const formatImporte = (valor, moneda = '€') => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return `${NUMERO_ES_DECIMALES.format(numero)}${moneda}`;
};

/**
 * Importe en euros, sin decimales y con punto de millares: `13.151€`.
 *
 * No se usa `style: 'currency'` a propósito: devuelve `13.151,40 €`, con
 * decimales y con un espacio duro antes del símbolo.
 */
export const formatSaldo = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return `${NUMERO_ES.format(Math.round(numero))}€`;
};

/** Fecha corta sin ceros a la izquierda: `8/8/2026`. */
export const formatFechaCorta = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

/**
 * Saldo con su fecha de corte: `13.151€ (8/8/2026)`.
 *
 * La fecha nunca es decorativa: un saldo de extracto es una foto del cierre
 * de ese día, no el saldo en tiempo real. Mostrarlo sin fecha invita a
 * confundir las dos cosas.
 */
export const formatSaldoConFecha = (valor, fecha) => {
  const importe = formatSaldo(valor);
  if (!importe) return null;
  const dia = formatFechaCorta(fecha);
  return dia ? `${importe} (${dia})` : importe;
};

/** Fecha y hora legibles para la próxima ejecución programada. */
export const formatProximaEjecucion = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

/** Hora `HH:MM` a partir de un `TIME` de MySQL (`09:30:00`). */
export const formatHora = (valor) => (valor ? String(valor).slice(0, 5) : null);

/**
 * Porcentaje con hasta tres decimales y punto de millares: `33,333 %`.
 * Para cuotas de titularidad y participaciones (01/10/2026).
 */
const PORCENTAJE_ES = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
  useGrouping: 'always',
});
export const formatPorcentaje = (valor) => {
  const numero = Number(valor);
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(numero)) return null;
  return `${PORCENTAJE_ES.format(numero)} %`;
};

/**
 * Tamaño de archivo con coma decimal: `1,5 MB`, `820 KB`. `toFixed()` daba
 * `1.5 MB`, con punto decimal inglés (01/10/2026).
 */
const TAMANO_ES = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: 'always' });
export const formatTamano = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${TAMANO_ES.format(n)} B`;
  if (n < 1048576) return `${TAMANO_ES.format(Math.round(n / 1024))} KB`;
  if (n < 1073741824) return `${TAMANO_ES.format(n / 1048576)} MB`;
  return `${TAMANO_ES.format(n / 1073741824)} GB`;
};
