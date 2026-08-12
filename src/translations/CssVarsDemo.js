/**
 * Traducciones para CssVarsDemo.jsx
 * Textos ordenados por orden de aparición en la página
 */

export const CssVarsDemoTranslations = {
  text1: {
    label: "Título principal",
    spanish: "🔍 CSS Variables Demo",
    english: "🔍 CSS Variables Demo"
  },
  text2: {
    label: "Descripción principal",
    spanish: "Observa cómo las CSS Variables cambian en tiempo real al cambiar de tema",
    english: "Watch how CSS Variables change in real-time when switching themes"
  },
  text3: {
    label: "Label tema actual",
    spanish: "Tema Actual:",
    english: "Current Theme:"
  },
  text4: {
    label: "Botón ver código",
    spanish: "Ver",
    english: "Show"
  },
  text5: {
    label: "Botón ocultar código",
    spanish: "Ocultar",
    english: "Hide"
  },
  text6: {
    label: "Texto código CSS",
    spanish: "Código CSS",
    english: "CSS Code"
  },
  text7: {
    label: "Título sección botones",
    spanish: "1. Botones",
    english: "1. Buttons"
  },
  text8: {
    label: "Botón primario",
    spanish: "Botón Primario (bg-primary)",
    english: "Primary Button (bg-primary)"
  },
  text9: {
    label: "Botón secundario",
    spanish: "Botón Secundario (bg-secondary)",
    english: "Secondary Button (bg-secondary)"
  },
  text10: {
    label: "Título sección inputs",
    spanish: "2. Inputs",
    english: "2. Inputs"
  },
  text11: {
    label: "Placeholder input normal",
    spanish: "Input normal",
    english: "Normal input"
  },
  text12: {
    label: "Placeholder input error",
    spanish: "Input con error",
    english: "Input with error"
  },
  text13: {
    label: "Título sección elevación",
    spanish: "3. Sistema de Elevación",
    english: "3. Elevation System"
  },
  text14: {
    label: "Elevación 0",
    spanish: "Elevación 0 - bg-background",
    english: "Elevation 0 - bg-background"
  },
  text15: {
    label: "Elevación 1",
    spanish: "Elevación 1 - bg-surface1",
    english: "Elevation 1 - bg-surface1"
  },
  text16: {
    label: "Elevación 2",
    spanish: "Elevación 2 - bg-surface2",
    english: "Elevation 2 - bg-surface2"
  },
  text17: {
    label: "Título sección estados",
    spanish: "4. Estados (Alerts)",
    english: "4. States (Alerts)"
  },
  text18: {
    label: "Estado success",
    spanish: "✓ Success - bg-success",
    english: "✓ Success - bg-success"
  },
  text19: {
    label: "Estado error",
    spanish: "✗ Error - bg-destructive",
    english: "✗ Error - bg-destructive"
  },
  text20: {
    label: "Estado warning",
    spanish: "⚠ Warning - bg-warning",
    english: "⚠ Warning - bg-warning"
  },
  text21: {
    label: "Estado info",
    spanish: "ℹ Info - bg-info",
    english: "ℹ Info - bg-info"
  },
  text22: {
    label: "Título sección card",
    spanish: "5. Card Completo",
    english: "5. Complete Card"
  },
  text23: {
    label: "Título card",
    spanish: "Card Title",
    english: "Card Title"
  },
  text24: {
    label: "Descripción card",
    spanish: "Este card usa bg-surface1 que incluye automáticamente: background, border y shadow coherentes.",
    english: "This card uses bg-surface1 which automatically includes: coherent background, border and shadow."
  },
  text25: {
    label: "Botón acción",
    spanish: "Action",
    english: "Action"
  },
  text26: {
    label: "Botón cancelar",
    spanish: "Cancel",
    english: "Cancel"
  },
  text27: {
    label: "Título sección tabla",
    spanish: "6. Tabla",
    english: "6. Table"
  },
  text28: {
    label: "Header tabla nombre",
    spanish: "Name",
    english: "Name"
  },
  text29: {
    label: "Header tabla estado",
    spanish: "Status",
    english: "Status"
  },
  text30: {
    label: "Item 1",
    spanish: "Item 1",
    english: "Item 1"
  },
  text31: {
    label: "Estado activo",
    spanish: "Active",
    english: "Active"
  },
  text32: {
    label: "Item 2",
    spanish: "Item 2",
    english: "Item 2"
  },
  text33: {
    label: "Estado pendiente",
    spanish: "Pending",
    english: "Pending"
  },
  text34: {
    label: "Item 3",
    spanish: "Item 3",
    english: "Item 3"
  },
  text35: {
    label: "Título cómo funciona",
    spanish: "💡 Cómo Funciona",
    english: "💡 How It Works"
  },
  text36: {
    label: "Paso 1 label",
    spanish: "1. CSS Variables en themes.css:",
    english: "1. CSS Variables in themes.css:"
  },
  text37: {
    label: "Paso 1 descripción",
    spanish: "Define colores base que cambian según data-theme",
    english: "Defines base colors that change according to data-theme"
  },
  text38: {
    label: "Paso 2 label",
    spanish: "2. Tailwind v4 genera clases:",
    english: "2. Tailwind v4 generates classes:"
  },
  text39: {
    label: "Paso 2 descripción",
    spanish: "Automáticamente crea .bg-primary usando var(--color-primary)",
    english: "Automatically creates .bg-primary using var(--color-primary)"
  },
  text40: {
    label: "Paso 3 label",
    spanish: "3. Direct Tailwind classes:",
    english: "3. Direct Tailwind classes:"
  },
  text41: {
    label: "Paso 3 descripción",
    spanish: "Use classes like 'bg-primary' directly (no tm.* mapping)",
    english: "Use classes like 'bg-primary' directly (no tm.* mapping)"
  },
  text42: {
    label: "Paso 4 label",
    spanish: "4. Al cambiar tema:",
    english: "4. When changing theme:"
  },
  text43: {
    label: "Paso 4 descripción",
    spanish: "Solo cambia data-theme attribute, las clases permanecen iguales",
    english: "Only changes data-theme attribute, classes remain the same"
  },
  text44: {
    label: "Resultado label",
    spanish: "✨ Resultado:",
    english: "✨ Result:"
  },
  text45: {
    label: "Resultado descripción",
    spanish: "Switching instantáneo sin React re-renders (~5-10ms)",
    english: "Instant switching without React re-renders (~5-10ms)"
  },
  text46: {
    label: "Título pruébalo ahora",
    spanish: "🎯 Pruébalo Ahora",
    english: "🎯 Try It Now"
  },
  text47: {
    label: "Instrucciones finales",
    spanish: "Usa el selector de tema en la navbar para cambiar entre light, dark y high-contrast. Observa cómo TODOS los elementos cambian instantáneamente sin recargar la página.",
    english: "Use the theme selector in the navbar to switch between light, dark and high-contrast. Watch how ALL elements change instantly without reloading the page."
  }
};
