/**
 * Comprueba que TODA tabla de la interfaz usa los colores del tema (26/08/2026).
 *
 * Nace de una tabla concreta —el historial de descargas— que se veía igual con
 * cualquier tema: la cabecera y las filas llevaban su color puesto a mano, y el
 * tema no pintaba nada. El problema no era esa pantalla, era que nada avisaba.
 * Esto avisa.
 *
 * Dos reglas, y las dos salen del mismo sitio:
 *
 *   1. Una cabecera es `bg-table-header text-on-table-header`, y una fila es
 *      `bg-table-row`/`bg-table-row-striped` con su `text-on-...`. Sin eso, la
 *      tabla no es del tema.
 *   2. Una celda NO pone su propio color de texto. El color lo da la fila, y por
 *      eso todo el contenido de una fila se ve igual. Una celda que se pinta
 *      sola se sale del tema en cuanto el tema cambia.
 *
 * Los colores de estado —`text-success`, `text-destructive-text`,
 * `text-warning`— sí se permiten: ahí el color ES el dato.
 *
 * Se ejecuta solo en cada `npm run build`. A mano:
 *
 *   cd D:\ALKIM\IA\FRONTEND
 *   npm run tema
 *
 * Devuelve 1 si algo se sale de la norma, para poder colgarlo de la compilación.
 */
const fs = require('fs');
const path = require('path');

// Da igual desde dónde se lance: la raíz es el `src` de este proyecto.
const PROYECTO = path.resolve(__dirname, '..');
const RAIZ = path.join(PROYECTO, 'src');
const COLOR_A_MANO = /\btext-on-(surface1|surface2|background|surface3)(\/\d+)?\b/;

const ficheros = [];
(function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p);
    else if (e.name.endsWith('.jsx')) ficheros.push(p);
  }
})(RAIZ);

// Estas pantallas SON el catálogo de colores: su tabla enseña cada color del
// tema uno a uno, así que ahí un color a dedo es el contenido, no un descuido.
const EXENTOS = [
  'src/pages/ColorsList.jsx',
  'src/pages/CssVarsDemo.jsx',
  'src/components/ThemeEditor/ColorPickerModal.jsx',
  'src/components/ThemeEditor/SectionPreviews.jsx',
];

const fallos = [];
for (const fichero of ficheros) {
  const texto = fs.readFileSync(fichero, 'utf8');
  if (!/<table[\s>]/.test(texto)) continue;
  const relativo = path.relative(PROYECTO, fichero).replace(/\\/g, '/');

  if (EXENTOS.some((e) => relativo.endsWith(e))) continue;

  // El tema se puede aplicar de tres maneras, y las tres valen: la clase de
  // Tailwind (`bg-table-header`), la clase de utilities.css (`table-header`, que
  // por dentro es la misma variable) o la variable de CSS directamente, cuando
  // el color se decide en tiempo de ejecución. La que no vale es un color a dedo.
  const conCabecera = /<thead[\s>]/.test(texto);
  if (conCabecera && !/(bg-table-header|--color-table-header|table-header)/.test(texto)) {
    fallos.push(`${relativo}: la cabecera no usa los colores del tema`);
  }
  if (!/(bg-table-row|--color-table-row|table-row)/.test(texto)) {
    fallos.push(`${relativo}: las filas no usan los colores del tema`);
  }

  // Dentro de la tabla, ninguna celda se pinta el texto por su cuenta.
  const lineas = texto.split('\n');
  let dentro = false;
  lineas.forEach((linea, i) => {
    if (/<table[\s>]/.test(linea)) dentro = true;
    if (/<\/table>/.test(linea)) dentro = false;
    if (!dentro) return;
    if (COLOR_A_MANO.test(linea) && !/text-on-table/.test(linea)) {
      fallos.push(`${relativo}:${i + 1}: la celda se pinta el texto a mano (${linea.match(COLOR_A_MANO)[0]}); el color lo da la fila`);
    }
  });
}

if (!fallos.length) {
  console.log('Todas las tablas usan los colores del tema.');
  process.exit(0);
}
console.error(`Tablas fuera del tema (${fallos.length}):\n`);
for (const f of fallos) console.error(`  · ${f}`);
console.error('\nNorma: docs/CRITERIOS_UI_LISTADOS.md');
process.exit(1);
