# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ALKIM is a full-stack application with a monorepo structure containing:
- **BACKEND**: Node.js/Express REST API with MySQL database
- **FRONTEND**: React + Vite frontend with Tailwind CSS and Zustand state management
- **DATABASE**: SQL schemas and seeders for MySQL database

This is a multi-language, multi-theme application with user authentication and authorization features.

## Development Commands

### Backend (BACKEND)

The backend currently has no build/test scripts configured. Development workflow:

```bash
cd BACKEND
node app.js
```

The server runs on port 3000 by default (configurable via `.env` file). Test endpoint: `http://localhost:3000/tables/test`

**Environment Setup**: Create a `.env` file with:
- `NODE_ENV` (development/production)
- `PORT`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`

### Frontend (FRONTEND)

```bash
cd FRONTEND

# Development server
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

**Environment Setup**: Configure `.env.development` or `.env.production` with:
- `VITE_HTTPS` (true/false)
- `VITE_HOST`
- `VITE_PORT`

For HTTPS development, place SSL certificates in `FRONTEND/certificates/`:
- `localhost.key`
- `localhost.crt`

**Tailwind CSS Configuration:**
- **Version:** v4.1.17 (migrated from v3.4.15 on 2025-01-31)
- **Configuration Method:** PostCSS plugin (NOT Vite plugin)
- **Config Files:**
  - ✅ `postcss.config.js` - Contains `@tailwindcss/postcss` plugin
  - ✅ `src/index.css` - Uses `@import "tailwindcss"` syntax
  - ❌ NO `tailwind.config.js` (v4 uses CSS-based config via `@theme` directive)
- **Performance:**
  - ~10x faster builds than v3
  - HMR (Hot Module Replacement) in 20-50ms
  - Initial build ~500ms
- **Features:**
  - Native container queries (@container)
  - CSS Variables automatically exposed
  - 3D transforms
  - OKLCH colors
  - Simplified configuration (CSS-only, no JS config needed)

## Architecture

### Backend Architecture

The backend follows an MVC pattern with a generic table-based CRUD system:

**Entry Point**: `app.js` initializes Express, applies middleware (JSON parsing, error handlers), mounts routes, and starts the server.

**Configuration** (`config/`):
- `db.js`: MySQL connection pool using mysql2/promise
- `env.js`: Environment-based configuration (development/production)

**Routes** (`routes/`):
- `index.js`: Central router mounting all route modules
- `tablasRoute.js`: Generic CRUD routes for whitelisted tables at `/tables/:tabla`

**Controllers** (`controllers/`):
- `tablasController.js`: Validates table access against whitelist (`tablasPermitidas`), handles CRUD operations, returns appropriate HTTP status codes

**Models** (`models/`):
- `tablasModel.js`: Generic database operations using parameterized queries to prevent SQL injection

**Middleware** (`middlewares/`):
- `errorHandler.js`: 404 handler and general error handler (must be last middleware)

**Whitelisted Tables**: Only these tables are accessible via API:
- activos, activos_parciales, empresas, test, idiomas, idioma_palabras, idiomas.frases, usuarios, usuarios_conig, usuario_empresa

### Frontend Architecture

**Entry Point**: `main.jsx` renders `App.jsx` into the DOM.

**App Structure** (`src/App.jsx`):
- React Router setup with client-side routing
- Protected routes using `ProtectedRoute` component checking Zustand authentication state
- Global Navbar component
- Theme application via Tailwind classes

**State Management** (`hooks/useStore.js`):
- Zustand store managing global state: `theme`, `language`, `isAuthenticated`
- Persists theme and language to localStorage
- Auto-detects initial theme from system preferences or localStorage
- Auto-detects initial language from browser or localStorage
- Supported languages: en, es, fr, de

**Context API** (`contexts/TmTrContext.jsx`):
- `TmTrProvider`: Wraps the app and provides computed theme and translation values
- `useTmTr()` hook: Efficient access to `tm` (computed theme classes) and `tr` (translations)
- Eliminates repetitive lookups of `themes[theme]` and `translations[language]`
- Provides `setTheme` and `setLanguage` functions alongside computed values

**Configuration** (`config/`):
- `themes.js`: Tailwind CSS class mappings for three themes with categorized design tokens:
  - **Light Theme**: White backgrounds, dark text, blue accents
  - **Dark Theme**: Dark gray backgrounds, light text, no visible borders (bg-gray-800)
  - **High-Contrast Theme**: Terminal retro style with:
    - Black background (`bg-black`)
    - Green phosphorescent text (`text-green-400`)
    - Blue navbar (`bg-blue-800` with `text-white`)
    - Dark red-gray hover (`bg-red-950`)
  - **Categories**: Application defaults (bg, tx, bd, sh, hv), Navbar (nav_*), Primary (pri_*), Secondary/buttons (sec_*), Tables/forms (acc_*, alt_*), States (suc_*, war_*, err_*)
- `translations.js`: i18n strings keyed by language code (en, es, fr, de)

**Components** (`components/`):
- `Navbar.jsx`: Top navigation with theme/language dropdowns
- `DropdownTheme.jsx`: Theme switcher dropdown (uses generic Dropdown component)
- `DropdownLanguage.jsx`: Language switcher dropdown (uses generic Dropdown component)

**UI Components Library** (`components/UI/`):
- **Generic Components** (reusable, theme-aware):
  - `Button.jsx`: Themed button wrapper (wraps ButtonBase)
  - `Tabs.jsx`: Themed tabs wrapper (wraps TabsBase)
  - `Dropdown.jsx`: Themed dropdown wrapper (wraps DropdownBase)
- **Base Components** (`components/UI/Base/`):
  - `ButtonBase.jsx`: Pure button component (no dependencies, accepts themeConfig)
  - `TabsBase.jsx`: Pure tabs component (no dependencies, accepts themeConfig)
  - `DropdownBase.jsx`: Pure dropdown component (no dependencies, accepts themeConfig)
- **Pattern**: Base components are framework-agnostic, Wrappers apply themes via TmTrContext

**Component Subdirectories**: ColorEditor/, Home/

**Pages** (`pages/`):
- `HomePage.jsx`: Landing page
- `Muestra.jsx`: Sample/demo page with tabs, buttons, forms demonstrating theme integration
- `ColorEditor.jsx`: Legacy color editor (OLD - to be deprecated)
- `ThemeEditor.jsx`: Visual theme editor with:
  - Theme selector (Light, Dark, High-Contrast)
  - Property editing organized by categories (App, Navbar, Primary, Secondary, Tables, States)
  - Live preview area (work in progress)
  - Save/Cancel with navigation blocking on unsaved changes
  - Reset to defaults functionality
  - Future: Color picker, eyedropper tool, export/import themes

**Hooks**:
- `useStore.js`: Zustand global state hook
- `useCloseDropdown.jsx`: Custom hook for dropdown close behavior

**Routing**:
- `/` - HomePage
- `/tests` - Static test content (inline in App.jsx)
- `/muestra` - Sample page
- `/coloreditor` - Legacy color editor
- `/themeeditor` - Visual theme editor with live preview
- `/logged` - Protected area (requires authentication)
- `/login` - Login page (placeholder)
- `/register` - Registration page (placeholder)

### Database Schema

Located in `DATABASE/`. Key tables:

**a_users**: User authentication and profile data with fields for:
- Authentication (email, password_hash, auth_provider)
- Profile (nombre, apellido, telefono, idioma, tema)
- Security (rol, permisos, verificado, bloqueado_hasta, intentos_fallidos)
- Tracking (ultima_sesion, fecha_ultima_actividad, direccion_ip)

**a_tokens**: JWT refresh tokens for authentication system

**Other tables**: languages (idiomas), translations (idioma_palabras), themes (THEMES CREATE.sql), etc.

SQL files are organized as:
- `*CREATE.sql` - Table schemas
- `*INS.sql` - Insert data
- `seeders/` - Test data

## Key Implementation Patterns

### Using UI Components

**Button Component:**
```jsx
import { Button } from '../components/UI/Button';

// Primary button (default)
<Button onClick={handleClick}>Click Me</Button>

// Secondary button
<Button variant="secondary" onClick={handleClick}>Cancel</Button>

// Different sizes
<Button size="lg">Large Button</Button>
```

**Tabs Component:**
```jsx
import { Tabs } from '../components/UI/Tabs';

const tabs = [
  { id: 'tab1', label: 'First Tab', content: <div>Tab 1 content</div> },
  { id: 'tab2', label: 'Second Tab', content: <div>Tab 2 content</div> }
];

<Tabs tabs={tabs} defaultTab="tab1" />
```

**Dropdown Component:**
```jsx
import { Dropdown } from '../components/UI/Dropdown';
import { Globe } from 'lucide-react';

const options = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' }
];

<Dropdown
  triggerIcon={<Globe />}
  options={options}
  onSelect={handleSelect}
  variant="navbar"
  closeOnClickOutside={true}  // Optional, default true
  closeOnSelect={true}         // Optional, default true
/>
```

**Creating Custom UI Components:**
1. Create Base component in `components/UI/Base/` (pure, no theme dependencies)
2. Create Wrapper component in `components/UI/` (applies theme via `useTmTr()`)
3. Use Wrapper in app-specific components in `components/`

### Adding New Backend Routes

1. Create controller in `controllers/` following the pattern in `tablasController.js`
2. Create route file in `routes/` following the pattern in `tablasRoute.js`
3. Import and mount route in `routes/index.js`
4. If adding table access, update `tablasPermitidas` whitelist in `tablasController.js`

### Adding New Frontend Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.jsx` inside `<Routes>`
3. For protected pages, wrap in `<ProtectedRoute>`
4. Add translations to `src/config/translations.js` if needed
5. Use theme classes from `themes[theme].*` pattern

### Theme Integration

**Preferred Method** - Use TmTrContext for computed values:
```jsx
import { useTmTr } from '../contexts/TmTrContext';

const { tm, tr } = useTmTr();
<div className={`${tm.bg} ${tm.tx}`}>
  <button className={tm.pri_bg}>{tr.Login}</button>
</div>
```

**Legacy Method** - Direct Zustand access (avoid in new code):
```jsx
const { theme } = useStore();
<div className={`${themes[theme].bg} ${themes[theme].tx}`}>
```

### Internationalization

**Preferred Method** - Use TmTrContext:
```jsx
const { tm, tr } = useTmTr();
<h1>{tr.ztext1}</h1>
```

**Legacy Method** - Direct Zustand access (avoid in new code):
```jsx
const { language } = useStore();
const tr = translations[language];
```

### Changing Theme or Language

When you need to change theme/language (e.g., in dropdowns):
```jsx
const { theme, language, setTheme, setLanguage } = useTmTr();
<button onClick={() => setTheme('dark')}>{tr.themes.dark}</button>
```

## Project Structure Context

This monorepo has three main directories at the root level. Each has its own git repository initialized. When working across backend/frontend, coordinate changes that affect both (e.g., API contracts, authentication flow).

The backend uses a generic table controller pattern that dynamically handles CRUD for any whitelisted table, reducing boilerplate code but requiring careful whitelist management for security.

## Tailwind v4 Migration Notes

**Migration Date:** 2025-01-31
**From:** v3.4.15 → **To:** v4.1.17

**Key Changes:**
1. **Configuration Method:** Now uses `@tailwindcss/postcss` plugin instead of v3's approach
2. **No tailwind.config.js:** v4 uses CSS-based configuration via `@theme` directive
3. **CSS Syntax:** Changed from `@tailwind base/components/utilities` to `@import "tailwindcss"`
4. **Performance:** Builds are ~10x faster, HMR in 20-50ms

**Important Files:**
- `postcss.config.js` - Contains Tailwind v4 PostCSS plugin
- `src/index.css` - Uses new `@import "tailwindcss"` syntax
- `tailwind.config.js.v3.backup` - Backup of v3 config (for reference)

**Compatibility:**
- ✅ All existing Tailwind v3 classes still work
- ✅ No changes needed in component files
- ✅ themes.js continues working with class names (e.g., `bg-blue-600`)

**Future Enhancements:**
- Can optionally use CSS Variables for dynamic theming
- Can add `@theme` blocks in CSS for custom configuration
- Can leverage new v4 features (container queries, 3D transforms, etc.)

**Git Branches:**
- `backup-tailwind-v3` - Snapshot before v4 migration (commit: 158a64f)
- `open-ai/repaso` - Current branch with v4
