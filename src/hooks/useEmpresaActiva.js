import { useEffect, useState } from 'react';

/**
 * La empresa que está elegida arriba, en la barra.
 *
 * El selector de empresa guarda la elección en `localStorage` y avisa con el
 * evento `empresa-activa-cambiada`. Una pantalla que solo lea `localStorage` al
 * montarse se queda con la empresa de aquel momento: al cambiar de empresa la
 * lista seguía enseñando las cuentas de la anterior y había que recargar la
 * página para verla bien (23/08/2026).
 *
 * Este enganche devuelve la empresa activa **y se vuelve a pintar** cuando
 * cambia, aquí o en otra pestaña (`storage`).
 *
 * El valor es siempre texto: el identificador de la empresa, o `'todas'`.
 */
const leer = () => localStorage.getItem('empresaActiva') || 'todas';

export const TODAS = 'todas';

export function useEmpresaActiva() {
  const [empresa, setEmpresa] = useState(leer);

  useEffect(() => {
    const refrescar = () => setEmpresa(leer());
    window.addEventListener('empresa-activa-cambiada', refrescar);
    // Otra pestaña del mismo navegador: `storage` solo llega a las demás.
    window.addEventListener('storage', refrescar);
    return () => {
      window.removeEventListener('empresa-activa-cambiada', refrescar);
      window.removeEventListener('storage', refrescar);
    };
  }, []);

  return empresa;
}

/**
 * ¿Esta fila es de la empresa elegida?
 *
 * Con «Todas las empresas» pasa todo. Con una empresa concreta pasan las filas
 * de esa empresa —y **también las que no tienen empresa asignada**, porque si
 * no desaparecerían sin explicación y no habría desde dónde arreglarlas. Quien
 * pinte la lista puede contarlas aparte con `sinEmpresa`.
 */
export function esDeLaEmpresa(fila, empresa) {
  if (!empresa || empresa === TODAS) return true;
  if (fila?.empresa_id === null || fila?.empresa_id === undefined || fila?.empresa_id === '') return true;
  return String(fila.empresa_id) === String(empresa);
}

export function sinEmpresa(filas = []) {
  return filas.filter((fila) => fila?.empresa_id === null || fila?.empresa_id === undefined || fila?.empresa_id === '');
}

export default useEmpresaActiva;
