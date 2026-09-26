/**
 * Lo que los tres paneles de Saldo entienden igual (26/08/2026).
 *
 * Todo lo que está aquí estuvo antes escrito dos o tres veces en la maqueta, y
 * la tercera copia siempre acababa diciendo algo distinto: la cuenta que no se
 * había descargado nunca contaba en el aviso pero no llevaba su marca, porque
 * «sin actualizar» estaba definido en tres sitios. Una sola definición por idea.
 */

/** Millar con punto y sin decimales: 16.724 €. */
export const eur = (valor) =>
  `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' })
    .format(Number(valor) || 0)} €`;

/** El céntimo exacto, para el título de la fila. */
export const eurExacto = (valor, moneda = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda, useGrouping: 'always' })
    .format(Number(valor) || 0);

export const dias = (desde, hasta) => {
  if (!desde || !hasta) return null;
  return Math.round((new Date(`${hasta}T00:00:00Z`) - new Date(`${desde}T00:00:00Z`)) / 86400000);
};

/** DD/MES, con el mes en las tres letras del idioma activo. */
export const fechaCorta = (iso, meses) => {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${meses[m - 1] || '???'}`;
};

/**
 * Una cuenta activa está sin actualizar si su última consulta es más vieja que
 * los días de gracia. La que no se ha descargado nunca es la más atrasada de
 * todas, no la menos: por eso el `visto == null` cuenta como atrasada.
 *
 * Las desactivadas nunca lo están: no hay que actualizar lo que está apagado.
 */
export const sinActualizar = (cuenta, hoy, diasAtraso) =>
  Boolean(cuenta.activa) && (cuenta.visto == null || dias(cuenta.visto, hoy) > diasAtraso);

/** En qué zona cae un saldo. El color nunca va solo: lleva su figura. */
export const zonaDe = (cuenta, limites) => {
  if (!cuenta.activa || cuenta.saldo == null) return { clase: 'gris', figura: '○' };
  if (cuenta.saldo < limites.rojo) return { clase: 'rojo', figura: '■' };
  if (cuenta.saldo < limites.ambar) return { clase: 'ambar', figura: '▲' };
  if (cuenta.saldo >= limites.alto) return { clase: 'marino', figura: '◆' };
  return { clase: 'verde', figura: '●' };
};

/**
 * Dónde acaba la barra, en tanto por ciento del ancho.
 *
 * La escala no es lineal a propósito: las zonas de aviso se llevan el 32 % del
 * ancho aunque sean 1.000 € de 18.000. Con una escala lineal el rojo mediría
 * dos píxeles, y una zona de peligro que no se ve no avisa de nada.
 */
export const ZONAS = { rojo: 18, ambar: 32, alto: 78 };

export const anchoDe = (valor, limites, techo) => {
  const { rojo: R, ambar: A, alto: V } = ZONAS;
  if (valor <= limites.rojo) return (valor / (limites.rojo || 1)) * R;
  if (valor <= limites.ambar) {
    return R + ((valor - limites.rojo) / ((limites.ambar - limites.rojo) || 1)) * (A - R);
  }
  if (valor <= limites.alto) {
    return A + ((valor - limites.ambar) / ((limites.alto - limites.ambar) || 1)) * (V - A);
  }
  const resto = Math.max(techo - limites.alto, 1);
  return V + Math.min((valor - limites.alto) / resto, 1) * (100 - V);
};

/** El número que enseña cada panel. */
export const valorDe = (cuenta, vista) =>
  vista === 'saldo' ? cuenta.saldo : (vista === 'ingresos' ? cuenta.ingresos : cuenta.gastos);
