//App.jsx

import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Hooks, configs y context
import { useStore } from "./hooks/useStore";
import { TmTrProvider, useTmTr } from "./contexts/TmTrContext";

// Layout
import MainLayout from "./components/Layout/MainLayout";

// Componentes globales
// import Navbar from "./components/Navbar"; // Ahora en MainLayout

// Páginas
import HomePage from "./pages/HomePage";
import Muestra from "./pages/Muestra";
import ColorsList from "./pages/ColorsList";
import CssVarsDemo from "./pages/CssVarsDemo";
import ThemeEditor from "./pages/ThemeEditor";
import SQLConsole from "./pages/SQLConsole";
import Consola from "./pages/Consola";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyPhone from "./pages/VerifyPhone";
import Sessions from "./pages/Sessions";
import ControlPanel from "./pages/ControlPanel";
import UserSettings from "./pages/UserSettings";
import ControlPanelPrototype from "./pages/ControlPanelPrototype";
import MockupUserView from "./pages/MockupUserView";
import BancosPage from './pages/Conta/Bancos/BancosPage'; // Nueva página unificada (Gestión)
import ConciliacionPage from './pages/Procesos/ConciliacionPage'; // Nueva página de Procesos
import GestionBancos from "./pages/Conta/Bancos/GestionBancos";
import ExtractosPage from "./pages/Tesoreria/Extractos/ExtractosPage";
import ExtractosLog from "./pages/Tesoreria/Extractos/ExtractosLog";
import MovimientosPage from "./pages/Tesoreria/MovimientosPage";
import DocumentacionPage from "./pages/Documentacion/DocumentacionPage";

/**
 * ProtectedRoute (Fase 1)
 * - Sin props extra: solo requiere autenticación.
 * - Con `table` (y opcionalmente `level`): además exige permiso sobre esa tabla
 *   (None < Read < Write < Full). Si el usuario navega por URL directa a un
 *   módulo sin permiso, se le redirige a la home.
 */
const ProtectedRoute = ({ children, table = null, level = 'Read' }) => {
  const { isAuthenticated, permissionsLoaded, can } = useStore();

  if (!isAuthenticated) return <Navigate to="/login" />;

  if (table) {
    // Esperar a que la matriz de permisos esté cargada (evita falsos rechazos al recargar)
    if (!permissionsLoaded) return null;
    if (!can(table, level)) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { tr } = useTmTr();
  const { isAuthenticated, sessionChecked, fetchTheme, fetchMe, restoreSession } = useStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTheme();
      fetchMe();
    }
  }, [isAuthenticated, fetchTheme, fetchMe]);

  if (!sessionChecked) return null;

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/muestra" element={<Muestra />} />
          <Route path="/mockup-user" element={<MockupUserView />} />
          <Route path="/colorslist" element={<ColorsList />} />
          <Route path="/cssvars" element={<CssVarsDemo />} />
          
          {/* Contabilidad / Bancos */}
          <Route
            path="/conta/ingresos"
            element={
              <ProtectedRoute table="m_ingresos">
                <div className="p-8">Módulo de Ingresos (Próximamente)</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/conta/gastos"
            element={
              <ProtectedRoute table="m_gastos">
                <div className="p-8">Módulo de Gastos (Próximamente)</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/conta/bancos"
            element={
              <ProtectedRoute table="ban_account">
                <BancosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procesos/conciliacion"
            element={
              <ProtectedRoute table="ban_transaction">
                <ConciliacionPage />
              </ProtectedRoute>
            }
          />

          {/* Tesorería / Extractos */}
          <Route
            path="/tesoreria/extractos"
            element={
              <ProtectedRoute table="ban_transaction">
                <ExtractosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tesoreria/extractos/logs"
            element={
              <ProtectedRoute table="ban_crawler_log">
                <ExtractosLog />
              </ProtectedRoute>
            }
          />
          <Route path="/themeeditor" element={<ThemeEditor />} />
          <Route path="/coloreditor" element={<ThemeEditor />} />
          <Route path="/sql-console" element={<SQLConsole />} />
          <Route
            path="/documentacion"
            element={
              <ProtectedRoute>
                <DocumentacionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tesoreria/movimientos"
            element={
              <ProtectedRoute table="ban_transaction">
                <MovimientosPage />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          <Route
            path="/verify-phone"
            element={
              <ProtectedRoute>
                <VerifyPhone />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consola"
            element={
              <ProtectedRoute>
                <Consola />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <Sessions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/control-panel"
            element={
              <ProtectedRoute>
                <ControlPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/control-panel-prototype"
            element={
              <ProtectedRoute>
                <ControlPanelPrototype />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MainLayout>
    </Router>
  );
}

function App() {
  return (
    <TmTrProvider>
      <AppContent />
    </TmTrProvider>
  );
}

export default App;
