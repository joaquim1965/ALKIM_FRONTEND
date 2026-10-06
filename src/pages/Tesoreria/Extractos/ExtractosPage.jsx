import React, { useState, useEffect, useRef } from 'react';
import { useTmTr } from '../../../contexts/TmTrContext';
import { Card, Button, Badge, Spinner, Tooltip } from '../../../components/UI';
import { PasswordInput } from '../../../components/UI/PasswordInput';
import {
  Download, Rows3, AlertCircle, CheckCircle, KeyRound, ShieldCheck, Trash2,
  CalendarClock, CalendarOff, X, Video, ListChecks, CircleDot, FileText, Plus, RefreshCw,
  LogOut, Upload, Images,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, authHeaders } from '../../../services/api';
import { formatSaldoConFecha, formatFechaCorta } from '../../../utils/format';
import EditorSecuencia from './EditorSecuencia';
import VisorExtractos from './VisorExtractos';
import ComparadorPasos from './ComparadorPasos';
import AltaCuenta from './AltaCuenta';
import { abrirPantallaRemota } from './PantallaRemota';
import useEmpresaActiva, { esDeLaEmpresa } from '../../../hooks/useEmpresaActiva';
import CampoFecha from '../../../components/UI/CampoFecha';

/**
 * Tesorería → Extractos.
 *
 * Lista de cuentas con descarga automatizada. Se presenta en tabla y no en
 * tarjetas porque el número de cuentas crece con cada banco que se da de alta,
 * y una rejilla de tarjetas obliga a rastrear la pantalla para comparar dos
 * saldos o dos horas de ejecución.
 */
// Botón «marcado» de una fila —algo que ya está hecho o encendido: credencial
// guardada (Revocar), guion grabado (Regrabar), autodescarga activa—: fondo
// azul con el icono en blanco (26/09/2026).
const MARCADO = { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: 'var(--color-on-primary)' };

const ExtractosPage = () => {
  const { t } = useTmTr('Extractos');
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [connecting, setConnecting] = useState({});
  const [scheduling, setScheduling] = useState({});
  const [syncResult, setSyncResult] = useState(null);
  // Carga manual de un extracto bajado a mano. Un solo <input type="file">
  // oculto para toda la tabla; `cargaPara` recuerda de qué cuenta es.
  const selectorFichero = useRef(null);
  const [cargaPara, setCargaPara] = useState(null);
  const [cargando, setCargando] = useState({});
  const [credentialModal, setCredentialModal] = useState(null);
  const [quitarModal, setQuitarModal] = useState(null);
  const [credentialForm, setCredentialForm] = useState({ username: '', password: '', clave3: '', clave4: '' });
  const [savingCredential, setSavingCredential] = useState(false);
  const [twoFactor, setTwoFactor] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [submittingTwoFactor, setSubmittingTwoFactor] = useState(false);
  // Qué ha fallado al enviar el código, para enseñarlo **dentro** del modal.
  //
  // Antes el fallo salía en el modal de resultado, que se pinta encima: el
  // usuario perdía de vista el campo y no tenía dónde corregir. Ver
  // `submitTwoFactor`.
  const [twoFactorError, setTwoFactorError] = useState(null);
  // Caracteres mínimos para dar el código por escrito. Cuatro, que es lo que ya
  // exigía el campo. **No son solo cifras**: el código de ING trae letras.
  const LARGO_MINIMO = 4;
  const [grabacion, setGrabacion] = useState(null);
  const [verProceso, setVerProceso] = useState(true);
  useEffect(() => {
    apiFetch('/crawler/schedule/config', { headers: authHeaders() })
      .then((r) => r.json()).then((res) => { if (res.success && typeof res.data?.verProceso === 'boolean') setVerProceso(res.data.verProceso); })
      .catch(() => {});
  }, []);
  // Antes de grabar se elige QUÉ guion: movimientos o justificante fiscal.
  const [eligeGuion, setEligeGuion] = useState(null);
  const [guionGuardado, setGuionGuardado] = useState(null);
  const [editando, setEditando] = useState(null);
  // Qué documento se está mirando: 'ultimo', 'mensual' o ninguno. Ver
  // VisorExtractos.jsx.
  const [visor, setVisor] = useState(null);
  // Comparar pasos: fotos de la última descarga buena frente al último fallo.
  const [comparar, setComparar] = useState(null);
  // Alta de cuenta: primero se apunta, luego ya se grabará su descarga.
  const [alta, setAlta] = useState(false);
  // Desde cuándo descargar: lo pregunta un diálogo antes de empezar.
  const [desdeCuando, setDesdeCuando] = useState(null);
  // Qué bajar (26/09/2026): movimientos, justificantes de Hacienda o los dos.
  const [queBajar, setQueBajar] = useState({ movimientos: true, justificantes: true });
  const [fechaManual, setFechaManual] = useState('2026-01-01');
  // «¿Todas las del banco?» — marcada por defecto: es lo que evita repetir
  // accesos y, con ellos, los 2FA. Ver `abrirDescarga`: se vuelve a marcar cada
  // vez que se abre el diálogo.
  const [todasDelBanco, setTodasDelBanco] = useState(true);
  // Aviso de una línea tras crear una cuenta. Ver `cuentaCreada`.
  const [avisoAlta, setAvisoAlta] = useState(null);
  // Filtro por banco. `null` = sin filtrar, que es como empieza siempre.
  // El banco elegido vive en la DIRECCIÓN, no en la memoria de la pantalla.
  //
  // Al ir al historial de una cuenta y volver, la pantalla se monta de nuevo y
  // un `useState` vuelve a su valor inicial: el filtro se perdía y había que
  // buscar otra vez la cuenta de la que se había salido, entre las de todos los
  // bancos (26/08/2026). En la dirección sobrevive a ir y volver —el botón de
  // atrás del navegador la restaura tal cual— y de paso el enlace se puede
  // guardar y compartir.
  const [parametros, setParametros] = useSearchParams();
  const bancoFiltro = parametros.get('banco') || null;
  const setBancoFiltro = (nombre) => {
    setParametros((antes) => {
      const nuevos = new URLSearchParams(antes);
      if (nombre) nuevos.set('banco', nombre);
      else nuevos.delete('banco');
      return nuevos;
    }, { replace: true });
  };
  const empresaActiva = useEmpresaActiva();
  // Descarga en cadena de todas las cuentas de un banco: [{crid, log}].
  const [cadena, setCadena] = useState(null);
  const [cadenaTerminada, setCadenaTerminada] = useState(false);

  /**
   * Cuentas cuya ventana de Chrome se ha quedado abierta esperando un «Salir».
   *
   * Cuando una descarga falla, la pantalla en la que murió es el diagnóstico, y
   * cerrar el navegador la borraba justo cuando servía de algo. Ahora se queda
   * abierta y el usuario la cierra cuando ha terminado de mirarla (petición del
   * usuario, 12/09/2026). El botón Salir sale solo en estas filas: en una fila
   * sin ventana abierta no haría nada.
   */
  const [ventanas, setVentanas] = useState([]);
  const [cerrandoVentana, setCerrandoVentana] = useState({});

  const fetchVentanas = async () => {
    try {
      const response = await apiFetch('/crawler/ventanas', { headers: authHeaders() });
      const res = await response.json();
      if (res.success) setVentanas((res.data || []).map((v) => Number(v.crid)));
    } catch {
      // Que no se pueda preguntar no es motivo para romper la pantalla: sin
      // respuesta simplemente no se pinta el botón.
    }
  };

  /** El botón Salir: cierra la ventana que se quedó abierta. */
  const cerrarVentana = async (crid) => {
    setCerrandoVentana((prev) => ({ ...prev, [crid]: true }));
    try {
      await apiFetch(`/crawler/ventanas/${crid}/cerrar`, { method: 'POST', headers: authHeaders() });
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    } finally {
      setCerrandoVentana((prev) => ({ ...prev, [crid]: false }));
      fetchVentanas();
    }
  };

  const fetchConfigs = async () => {
    try {
      const response = await apiFetch('/crawler/config', { headers: authHeaders() });
      const res = await response.json();
      if (res.success) setConfigs(res.data);
    } catch (err) {
      console.error('Error fetching crawler configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  // La ventana puede quedarse abierta sin que esta pestaña haya lanzado nada
  // —otra pestaña, o la descarga de antes de recargar—, así que se pregunta
  // cada poco y no solo al terminar una descarga.
  useEffect(() => {
    fetchVentanas();
    const reloj = window.setInterval(fetchVentanas, 5000);
    return () => window.clearInterval(reloj);
  }, []);

  const pollSyncStatus = async (crid, logId) => {
    try {
      const response = await apiFetch(`/crawler/logs/${logId}`, { headers: authHeaders() });
      const res = await response.json();
      // El registro ya no está: una descarga que falla borra el suyo del
      // historial. Antes se salía sin tocar nada y la fila se quedaba en
      // «Descargando…» hasta recargar la página con F5, tapando además sus
      // botones. Ahora se suelta la fila y se dice que terminó mal.
      if (!res.success) {
        setSyncing(prev => ({ ...prev, [crid]: null }));
        setTwoFactor(null);
        setSyncResult({ status: 'error', log: { mensaje: res.message || t('sync_ended_no_record') }, crid });
        fetchConfigs();
        fetchVentanas();
        return;
      }

      setSyncing(prev => ({ ...prev, [crid]: res.data }));
      // Si el código se ha tecleado en el panel de la ventana del banco, el
      // desafío desaparece y el modal de aquí se cierra solo (26/09/2026).
      if (res.data.challenge) setTwoFactor({ ...res.data.challenge, crid, logId });
      else setTwoFactor((prev) => (prev && prev.logId === logId ? null : prev));
      if (res.data.status === 'pending') {
        window.setTimeout(() => pollSyncStatus(crid, logId), 2000);
        return;
      }
      setSyncResult({ status: res.data.status, log: res.data, crid });
      setSyncing(prev => ({ ...prev, [crid]: null }));
      setTwoFactor(null);
      fetchConfigs();
      // Si ha fallado, lo más probable es que la ventana se haya quedado
      // abierta: se pregunta ya, para que el botón Salir salga sin esperar al
      // siguiente latido.
      fetchVentanas();
    } catch (err) {
      setSyncing(prev => ({ ...prev, [crid]: null }));
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    }
  };

  /**
   * Sigue una descarga en cadena: varias cuentas, un solo acceso.
   *
   * No se puede preguntar por un `logId`, porque los registros **nacen según le
   * llega el turno a cada cuenta**. Se pregunta por cuentas y el backend
   * devuelve el último registro de cada una, o `null` si aún no ha empezado.
   */
  const pollCadena = async (crids) => {
    try {
      const response = await apiFetch(`/crawler/logs/ultimos?crids=${crids.join(',')}`, { headers: authHeaders() });
      const res = await response.json();
      if (!res.success) return;

      setCadena(res.data);

      // El 2FA sale una sola vez, al abrir la sesión: el modal de siempre sirve.
      const conDesafio = res.data.find((f) => f.log?.challenge);
      if (conDesafio) setTwoFactor({ ...conDesafio.log.challenge, crid: conDesafio.crid, logId: conDesafio.log.clid });
      else setTwoFactor((prev) => (prev && crids.includes(prev.crid) ? null : prev));

      const enMarcha = res.data.some((f) => !f.log || f.log.status === 'pending');
      if (enMarcha) {
        window.setTimeout(() => pollCadena(crids), 2000);
        return;
      }

      setCadenaTerminada(true);
      setTwoFactor(null);
      fetchConfigs();
    } catch {
      window.setTimeout(() => pollCadena(crids), 3000);
    }
  };

  /**
   * Abre el diálogo de «¿desde cuándo?» para una cuenta.
   *
   * **Vuelve a marcar «todas las cuentas del banco» cada vez.** La casilla es
   * un estado de la pantalla, no de la cuenta: si alguien la desmarcaba para
   * bajar una sola, seguía desmarcada la próxima vez que abría el diálogo —con
   * otra cuenta, otro día— y se descargaba una sola sin que nadie lo hubiera
   * pedido. El valor por defecto tiene que ser el mismo siempre: marcada, que
   * es lo que ahorra accesos al banco (25/08/2026).
   */
  /**
   * Cargar un extracto descargado a mano (25/09/2026).
   *
   * Abre el explorador de ficheros; al elegir uno se sube, el backend lo
   * guarda como los descargados y añade sus movimientos. Vale para cualquier
   * cuenta, tenga guion o no. El resultado sale en el mismo modal que una
   * descarga, porque la respuesta es la misma fila del registro.
   */
  const elegirExtracto = (config) => {
    setCargaPara(config);
    if (selectorFichero.current) {
      selectorFichero.current.value = '';
      selectorFichero.current.click();
    }
  };

  const cargarExtracto = async (evento) => {
    const fichero = evento.target.files?.[0];
    const config = cargaPara;
    if (!fichero || !config) return;
    const crid = config.crid;
    setCargando(prev => ({ ...prev, [crid]: true }));
    try {
      const cuerpo = new FormData();
      cuerpo.append('fichero', fichero);
      const response = await apiFetch(`/crawler/cargar/${crid}`, {
        method: 'POST',
        headers: authHeaders(),
        body: cuerpo,
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message || t('upload_error'));
      setSyncResult({ status: 'success', log: res.data, crid, manual: true });
      fetchConfigs();
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    } finally {
      setCargando(prev => ({ ...prev, [crid]: false }));
      setCargaPara(null);
    }
  };

  const abrirDescarga = (config) => {
    setTodasDelBanco(true);
    setQueBajar({ movimientos: true, justificantes: true });
    setDesdeCuando(config);
  };

  const handleSync = async (crid, desde = null, banco = false) => {
    // Con «Ver proceso» (Descargas programadas), en el servidor se abre la
    // ventana del navegador remoto para seguir la descarga (27/09/2026).
    if (import.meta.env.PROD && verProceso) abrirPantallaRemota();
    setDesdeCuando(null);
    setSyncing(prev => ({ ...prev, [crid]: { status: 'pending' } }));
    try {
      const response = await apiFetch(`/crawler/sync/${crid}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(desde ? { desde } : {}),
          ...(banco ? { banco: true } : {}),
          movimientos: queBajar.movimientos,
          justificantes: queBajar.justificantes,
        }),
      });
      const res = await response.json();

      if (banco) {
        if (!res.success || !res.data?.crids?.length) throw new Error(res.message || t('sync_error'));
        setSyncing(prev => ({ ...prev, [crid]: null }));
        setCadenaTerminada(false);
        setCadena(res.data.crids.map((c) => ({ crid: c, log: null })));
        pollCadena(res.data.crids);
        return;
      }

      if (!res.success || !res.data?.logId) throw new Error(res.message || t('sync_error'));
      pollSyncStatus(crid, res.data.logId);
    } catch (err) {
      setSyncing(prev => ({ ...prev, [crid]: null }));
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    }
  };

  /**
   * Detiene una descarga en curso. Sin esto, una ejecución esperando un 2FA que
   * nadie va a introducir bloquea la cuenta durante diez minutos.
   */
  const handleCancel = async (crid) => {
    try {
      const response = await apiFetch(`/crawler/sync/${crid}/cancel`, { method: 'POST', headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setTwoFactor(null);
      setSyncing(prev => ({ ...prev, [crid]: null }));
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    }
  };

  const pollConnectionStatus = async (crid, logId) => {
    try {
      const response = await apiFetch(`/crawler/logs/${logId}`, { headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setConnecting(prev => ({ ...prev, [crid]: res.data }));
      if (res.data.challenge) setTwoFactor({ ...res.data.challenge, crid, logId });
      if (res.data.status === 'pending') {
        window.setTimeout(() => pollConnectionStatus(crid, logId), 2000);
        return;
      }
      setConnecting(prev => ({ ...prev, [crid]: null }));
      setTwoFactor(null);
      setTwoFactorCode('');
      setSyncResult({ status: res.data.status, log: res.data, crid, connection: true });
      if (res.data.status === 'success') fetchConfigs();
    } catch (err) {
      setConnecting(prev => ({ ...prev, [crid]: null }));
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    }
  };

  const handleConnect = async (crid) => {
    setConnecting(prev => ({ ...prev, [crid]: { status: 'pending' } }));
    try {
      const response = await apiFetch(`/crawler/connect/${crid}`, { method: 'POST', headers: authHeaders() });
      const res = await response.json();
      if (!res.success || !res.data?.logId) throw new Error(res.message);
      pollConnectionStatus(crid, res.data.logId);
    } catch (err) {
      setConnecting(prev => ({ ...prev, [crid]: null }));
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    }
  };

  const handleFinishConnection = async (crid) => {
    try {
      const response = await apiFetch(`/crawler/connect/${crid}/finalize`, { method: 'POST', headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setConnecting(prev => ({ ...prev, [crid]: null }));
      setSyncResult({ status: 'success', log: { mensaje: t('bank_session_renewed'), finalizado: new Date() }, crid, connection: true });
    } catch (err) { setSyncResult({ status: 'error', log: { mensaje: err.message }, crid }); }
  };

  const toggleSchedule = async (config) => {
    const crid = config.crid;
    setScheduling(prev => ({ ...prev, [crid]: true }));
    try {
      const response = await apiFetch(`/crawler/schedule/${crid}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(config.programado
          ? { programado: false }
          : { programado: true, hora_programada: String(config.hora_programada || '09:30').slice(0, 5) }),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      await fetchConfigs();
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    } finally {
      setScheduling(prev => ({ ...prev, [crid]: false }));
    }
  };

  /**
   * Grabación del guion de descarga.
   *
   * Se abre un navegador en la máquina del backend y el usuario baja el
   * extracto a mano una vez. Los pasos aparecen en vivo mientras navega: si un
   * clic no queda registrado se ve en el momento, y no tres semanas después
   * cuando la descarga automática falle de madrugada.
   */
  /**
   * Bancos cuyo botón de grabar lanza la SONDA en vez de la grabación.
   *
   * Provisional (27/08/2026). En ING grabar significa teclear el PIN, y allí
   * cada intento cuesta un SMS y tres fallos bloquean la cuenta: primero se
   * mira la pantalla sin tocarla y luego se escribe el guion. **Para volver a
   * la grabación normal basta con vaciar esta lista.**
   */
  // Vacía: el botón de grabar vuelve a grabar. Estuvo con ING mientras no había
  // guion —grabar exige teclear la clave, y allí cada intento cuesta un SMS—.
  // La sonda sigue disponible en el backend (POST /crawler/sonda-ing/:crid) para
  // cuando haya que volver a mirar esa pantalla (27/08/2026).
  const BANCOS_EN_SONDA = [];

  const lanzarSonda = async (config) => {
    setAvisoAlta(null);
    try {
      const response = await apiFetch(`/crawler/sonda-ing/${config.crid}`, {
        method: 'POST', headers: authHeaders(),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setAvisoAlta(res.message);
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid: config.crid });
    }
  };

  const iniciarGrabacion = async (config, tipo = 'movimientos') => {
    setEligeGuion(null);
    setGrabacion({ crid: config.crid, banco: config.banco_nombre, iniciando: true, pasos: [], tipo });
    // En producción el navegador del banco está en el servidor: se abre ya su
    // ventana, aprovechando el clic (si no, el navegador bloquea la ventana).
    if (import.meta.env.PROD) abrirPantallaRemota();
    // En el servidor, abrir el banco puede tardar (o quedarse en un captcha):
    // se sondea ya, para enseñar la pantalla remota en cuanto exista la sesión.
    window.setTimeout(() => seguirGrabacion(config.crid, 120), 2000);
    try {
      const response = await apiFetch(`/crawler/grabar/${config.crid}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      // El sondeo ya está en marcha desde que se pulsó grabar.
      setGrabacion((previa) => ({ crid: config.crid, banco: config.banco_nombre, ...previa, ...res.data, iniciando: false }));
    } catch (err) {
      setGrabacion(null);
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid: config.crid });
    }
  };

  // `arrancando`: cuántas veces más mirar si la sesión aún no existe (~3 min).
  const seguirGrabacion = async (crid, arrancando = 0) => {
    try {
      const response = await apiFetch(`/crawler/grabar/${crid}`, { headers: authHeaders() });
      const res = await response.json();
      if (!res.success) {
        // Mientras arranca aún no hay sesión: se vuelve a mirar.
        if (arrancando > 0) window.setTimeout(() => seguirGrabacion(crid, arrancando - 1), 1500);
        return;                              // la grabación terminó o caducó
      }

      // La grabación puede cerrarse desde la barra flotante que ahora se dibuja
      // dentro de la web del banco. En ese caso esta pantalla no ha pedido nada:
      // se entera aquí, en el sondeo, y enseña el resumen igual que si el botón
      // se hubiera pulsado desde aquí.
      if (res.data.terminado) {
        setGrabacion(null);
        if (res.data.resumen?.error) {
          setSyncResult({ status: 'error', log: { mensaje: res.data.resumen.error }, crid });
        } else {
          setGuionGuardado(res.data.resumen);
        }
        return;
      }

      setGrabacion((previa) => (previa && previa.crid === crid ? { ...previa, ...res.data } : previa));
      window.setTimeout(() => seguirGrabacion(crid), 1500);
    } catch { /* se reintenta en el siguiente ciclo */ }
  };

  const finalizarGrabacion = async (crid) => {
    try {
      const response = await apiFetch(`/crawler/grabar/${crid}/finalizar`, { method: 'POST', headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setGrabacion(null);
      setGuionGuardado(res.data);
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    }
  };

  const cancelarGrabacion = async (crid) => {
    await apiFetch(`/crawler/grabar/${crid}/cancelar`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    setGrabacion(null);
  };

  /**
   * Cuenta creada. No se ha descargado nada —ni falta—: se refresca la lista y
   * se dice en una línea qué toca ahora.
   *
   * **No se reutiliza el modal de la descarga.** Se hizo así al principio y el
   * resultado era absurdo: un cartel de «Descarga completada» con saldo «—»,
   * cero leídos, cero añadidos y rango «— · —» después de crear una cuenta. Un
   * mensaje que enseña seis números vacíos enseña a no leer los mensajes
   * (23/08/2026).
   */
  const cuentaCreada = async (res) => {
    setAlta(false);
    await fetchConfigs();
    setAvisoAlta(res.message);
  };

  // ¿La cuenta ya tiene credencial? Entonces usuario y contraseña pueden
  // dejarse en blanco para conservarlos y añadir solo la 3.ª o la 4.ª.
  const yaHayCredencial = Boolean(credentialModal?.credencial_estado && credentialModal.credencial_estado !== 'revocado');

  const openCredentialModal = (config) => {
    setCredentialForm({ username: '', password: '', clave3: '', clave4: '' });
    setCredentialModal(config);
  };

  // Editar (02/10/2026): desde la ventana que enseña las credenciales, se abre
  // la de guardar con los 4 valores ya puestos. Se guarda tal cual queda: una
  // casilla 3.ª o 4.ª vaciada se borra.
  const editCredential = () => {
    const { config, datos } = revokeModal || {};
    if (!config || !datos) return;
    setRevokeModal(null);
    setCredentialForm({
      username: datos.credencial1 || '', password: datos.credencial2 || '',
      clave3: datos.credencial3 || '', clave4: datos.credencial4 || '', completo: true,
    });
    setCredentialModal(config);
  };
  const editandoCredencial = Boolean(credentialForm.completo);

  const saveCredential = async (event) => {
    event.preventDefault();
    setSavingCredential(true);
    const crid = credentialModal.crid;
    try {
      const response = await apiFetch(`/crawler/credentials/${crid}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialForm),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setCredentialModal(null);
      setCredentialForm({ username: '', password: '', clave3: '', clave4: '' });
      await fetchConfigs();
      setSyncResult({ status: 'success', log: { mensaje: res.message, finalizado: new Date() }, crid, credential: true });
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
    } finally {
      setSavingCredential(false);
    }
  };

  // «Revocar» ya no es un `window.confirm` (02/10/2026): abre una ventana con
  // las 4 credenciales guardadas para verlas antes de borrarlas, con
  // «Eliminar» y «Cancelar».
  const [revokeModal, setRevokeModal] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const revokeCredential = async (config) => {
    setRevokeModal({ config, datos: null, error: null });
    try {
      const response = await apiFetch(`/crawler/credentials/${config.crid}/detalle`, { headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setRevokeModal({ config, datos: res.data, error: null });
    } catch (err) {
      setRevokeModal({ config, datos: null, error: err.message });
    }
  };

  const confirmRevoke = async () => {
    const config = revokeModal?.config;
    if (!config) return;
    setRevoking(true);
    try {
      const response = await apiFetch(`/crawler/credentials/${config.crid}`, { method: 'DELETE', headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setRevokeModal(null);
      await fetchConfigs();
    } catch (err) {
      setRevokeModal(null);
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid: config.crid });
    } finally {
      setRevoking(false);
    }
  };

  /**
   * Quitar la cuenta de la lista de descargas.
   *
   * No borra la cuenta bancaria ni sus movimientos: quita la descarga. Se avisa
   * de qué se lleva por delante —el guion grabado y la sesión— porque volver a
   * ponerla obliga a grabar otra vez, y eso pasa por el banco.
   */
  // Antes era un `window.confirm` con un texto que no decía qué se iba a
  // perder; el usuario la quitó por error (01/10/2026, Caja Rural). Ahora un
  // diálogo propio que dice qué se conserva y qué se borra.
  const quitarCuenta = (config) => setQuitarModal(config);

  const confirmarQuitarCuenta = async () => {
    const config = quitarModal;
    setQuitarModal(null);
    if (!config) return;
    try {
      const response = await apiFetch(`/crawler/cuentas/${config.crid}`, { method: 'DELETE', headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      await fetchConfigs();
    } catch (err) {
      setSyncResult({ status: 'error', log: { mensaje: err.message }, crid: config.crid });
    }
  };

  /**
   * Enviar el código del móvil.
   *
   * **El código sale de aquí y va directo al banco: no hay segundo intento.**
   * El endpoint contesta `success` en cuanto el intermediario le pasa el código
   * a la araña (`twoFactorBroker.submit` resuelve la promesa y borra el
   * desafío), *antes* de que el banco diga si es bueno. Si el banco lo rechaza,
   * la araña ya no tiene a quién volver a preguntar y la descarga se pierde —
   * y con ella el SMS.
   *
   * Por eso aquí se filtra antes de enviar: el campo solo admite dígitos y el
   * botón no se activa hasta tener `LARGO_MINIMO`. Un código con una letra
   * colada o a medio teclear ya no llega al banco.
   *
   * Y si el envío falla, **el modal no se cierra**: el error se pinta debajo
   * del campo y el texto se deja seleccionado para escribir encima. Antes el
   * fallo abría el modal de resultado por encima y había que empezar de cero.
   */
  const submitTwoFactor = async (event) => {
    event.preventDefault();
    if (!['approval', 'firma'].includes(twoFactor.type) && twoFactorCode.length < LARGO_MINIMO) return;
    setTwoFactorError(null);
    setSubmittingTwoFactor(true);
    try {
      const response = await apiFetch(`/crawler/challenges/${twoFactor.id}/verify`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(['approval', 'firma'].includes(twoFactor.type) ? {} : { code: twoFactorCode }),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setTwoFactor(null);
      setTwoFactorCode('');
    } catch (err) {
      // El modal se queda abierto a propósito: es el único sitio donde se puede
      // corregir sin volver a empezar.
      setTwoFactorError(err.message);
      const campo = document.getElementById('two-factor-code');
      if (campo) { campo.focus(); campo.select(); }
    } finally {
      setSubmittingTwoFactor(false);
    }
  };

  /**
   * Bancos presentes, para el filtro.
   *
   * Se sacan de las cuentas que hay, no de una tabla: si una entidad no tiene
   * cuentas con descarga, filtrar por ella solo puede dar una lista vacía.
   */
  const bancos = [...new Set(configs.map((c) => c.banco_nombre).filter(Boolean))].sort();

  /** Las otras cuentas del banco de la que se va a descargar, listas para ello. */
  const hermanasDelBanco = desdeCuando
    ? configs.filter((c) => c.banco === desdeCuando.banco
      && c.crid !== desdeCuando.crid
      && c.activo
      && c.tiene_secuencia)
    : [];
  // Dos filtros a la vez: el banco (desplegable de esta pantalla) y la empresa
  // elegida arriba, en la barra. La empresa faltaba: al cambiarla, la lista se
  // quedaba igual (23/08/2026). Las cuentas sin empresa se ven siempre.
  const visibles = configs.filter((c) => (!bancoFiltro || c.banco_nombre === bancoFiltro)
    && esDeLaEmpresa(c, empresaActiva));

  if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

  return (
    <div className="p-6">
      <input
        ref={selectorFichero}
        type="file"
        accept=".pdf,.xlsx,.xls,.q43,.n43,.txt,.aeb,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={cargarExtracto}
      />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
            <Download size={24} />
          </div>
          <div>
            <h1 className="mb-1 text-2xl font-black leading-none tracking-tight text-on-background">{t('title')}</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest">{t('subtitle')}</p>
          </div>
        </div>
      </header>

      {avisoAlta && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-success bg-surface2 px-5 py-3">
          <CheckCircle size={18} className="mt-0.5 shrink-0 text-success-border" />
          <p className="flex-1 text-sm font-bold">{avisoAlta}</p>
          <button
            type="button" onClick={() => setAvisoAlta(null)} aria-label={t('close_notice')}
            className="rounded-full p-1 text-on-surface2 transition-colors hover:text-on-surface1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filtro por banco.
          Un desplegable, sin botón de quitar: «Todos» ya es quitar el filtro, y
          un segundo control para lo mismo solo ocupa sitio. Aparece únicamente
          con más de una entidad — con una sola, un filtro que no filtra nada es
          ruido (23/08/2026). */}
      {/* Agregar cuenta: el «+» redondo delante del selector de banco, como
          en Bancos y cuentas (01/10/2026, petición del usuario). Antes iba
          en la cabecera, al principio de la fila de botones. Sale siempre,
          aunque el selector no (con un solo banco). */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Tooltip texto={t('add_account_hint')}>
          <button
            type="button" onClick={() => setAlta(true)} aria-label={t('add_account')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-primary-border bg-primary text-on-primary transition-colors hover:border-on-background"
          >
            <Plus size={20} />
          </button>
        </Tooltip>
      {bancos.length > 1 && (
        <label className="flex items-center gap-3">
          <span className="text-[11px] font-black uppercase tracking-widest text-on-surface2">{t('bank')}</span>
          <select
            value={bancoFiltro || ''}
            onChange={(e) => setBancoFiltro(e.target.value || null)}
            className="input-base rounded-xl border-border bg-surface2 px-4 py-2 text-sm font-bold"
          >
            <option value="">{t('all_banks').replace('{n}', configs.length)}</option>
            {bancos.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre} ({configs.filter((c) => c.banco_nombre === nombre).length})
              </option>
            ))}
          </select>
        </label>
      )}
      {/* Botones que estaban en el título de la página (04/10/2026). */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => navigate(bancoFiltro ? `/tesoreria/extractos/programacion?banco=${encodeURIComponent(bancoFiltro)}` : '/tesoreria/extractos/programacion')}>
            <CalendarClock size={16} /> {t('scheduled_downloads')}
          </Button>
          {/* Los documentos de verdad: el que se acaba de bajar y los que se
              guardan para Hacienda. Hasta ahora la pantalla contaba lo que
              había pasado con cada descarga, pero el fichero no se podía abrir
              desde ningún sitio. */}
          <Tooltip texto={t('tip_open_last_statement')}>
            <Button variant="primary" onClick={() => setVisor('ultimo')}>
              <FileText size={16} /> {t('last_statement')}
            </Button>
          </Tooltip>
          <Tooltip texto={t('tip_open_quarterly')}>
            <Button variant="primary" onClick={() => setVisor('trimestral')}>
              <FileText size={16} /> {t('quarterly_statement')}
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface2 shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              {/* Los mismos colores que DataTable: la lista de Extractos tiene
                  que leerse igual que las demás listas de la aplicación. Ver
                  CRITERIOS_UI_LISTADOS.md → «Dentro de una tabla, la celda no
                  pinta» (24/08/2026). */}
              <tr className="bg-table-header text-on-table-header">
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest">{t('col_actions')}</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest">{t('col_account')}</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest">{t('balance')}</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest">{t('last_sync')}</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest">{t('credential')}</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest">{t('col_auto')}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((config, indice) => {
                const enCurso = syncing[config.crid] || connecting[config.crid];
                const saldo = formatSaldoConFecha(config.saldo_ultima_consulta, config.fecha_ultima_consulta);
                const conCredencial = config.credencial_estado && config.credencial_estado !== 'revocado';
                return (
                  <tr
                    key={config.crid}
                    className={`transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover ${
                      indice % 2 === 1
                        ? 'bg-table-row-striped text-on-table-row-striped'
                        : 'bg-table-row text-on-table-row'
                    }`}
                  >
                    <td className="px-5 py-2">
                      {enCurso ? (
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" />
                          <span className="max-w-[220px] truncate text-xs font-semibold">
                            {enCurso.mensaje || t('syncing_msg')}
                          </span>
                          {/* Cancelar: recupera la cuenta sin esperar los 10 minutos de timeout. */}
                          <button
                            type="button"
                            onClick={() => handleCancel(config.crid)}
                            title={t('cancel_running_download')}
                            aria-label={t('cancel_running_download')}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-destructive-border
                              bg-surface1 text-destructive-text transition-colors hover:bg-destructive hover:text-on-destructive"
                          >
                            <X size={16} strokeWidth={3} />
                          </button>
                          {connecting[config.crid] && !conCredencial && (
                            <Button size="xs" variant="warning" onClick={() => handleFinishConnection(config.crid)}>
                              {t('finish')}
                            </Button>
                          )}
                          {/* Salir también aquí. Una descarga que falla borra su
                              registro del historial, y entonces la consulta de
                              estado da 404 y la fila se queda en «Descargando…»
                              para siempre. Justo entonces es cuando hay una
                              ventana abierta que mirar y cerrar, y el botón de
                              la rejilla de acciones no se llega a dibujar. */}
                          {ventanas.includes(Number(config.crid)) && (
                            <Tooltip texto={t('window_left_open')}>
                              <Button
                                size="xs" variant="warning"
                                disabled={Boolean(cerrandoVentana[config.crid])}
                                aria-label={t('close_window')}
                                onClick={() => cerrarVentana(config.crid)}
                              >
                                <LogOut size={15} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      ) : (
                        <div className="grid w-max shrink-0 grid-cols-[repeat(3,max-content)] gap-1.5">{/* max-content: al estrechar la tabla, los botones no se montan uno encima de otro (27/09/2026) */}
                          {/* Orden pedido por el usuario (26/09/2026), en filas de tres:
                              Autodescargas · Grabar/Regrabar · Credencial/Revocar
                              Login · Quitar cuenta · Revisar
                              Cargar extracto · Descargar · Historial */}
                          {/* Salir: cierra la ventana de Chrome que se quedó
                              abierta tras un fallo. Va la primera y en amarillo
                              porque es lo único de la fila que hay que atender
                              ahora: mientras siga abierta, la descarga siguiente
                              tendrá que cerrarla para poder empezar. Solo sale
                              cuando hay una ventana de verdad que cerrar. */}
                          {ventanas.includes(Number(config.crid)) && (
                            <Tooltip texto={t('window_left_open')}>
                              <Button
                                size="xs" variant="warning"
                                disabled={Boolean(cerrandoVentana[config.crid])}
                                aria-label={t('close_window')}
                                onClick={() => cerrarVentana(config.crid)}
                              >
                                <LogOut size={15} />
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip texto={config.programado ? t('remove_autodownload') : t('autodownload')}>
                            <Button
                              // Los botones de la fila siguen el color del texto del
                              // tema (blanco en oscuro). Uno «marcado» —aquí, la
                              // autodescarga activada— lleva fondo azul claro
                              // (26/09/2026). Y se puede pulsar para quitarla: antes
                              // se desactivaba y no había forma de desprogramar.
                              size="xs" variant="outline" className={config.programado ? '' : 'borde-del-texto'}
                              style={config.programado ? MARCADO : undefined}
                              aria-pressed={Boolean(config.programado)}
                              disabled={Boolean(scheduling[config.crid]) || !config.activo}
                              aria-label={config.programado ? t('remove_autodownload') : t('autodownload')}
                              onClick={() => toggleSchedule(config)}
                            >
                              {scheduling[config.crid]
                                ? <Spinner size="xs" />
                                : config.programado ? <CalendarOff size={15} /> : <CalendarClock size={15} />}
                            </Button>
                          </Tooltip>
                          <Tooltip texto={BANCOS_EN_SONDA.some((b) => b.test(config.banco_nombre || ''))
                            ? t('probe_action')
                            : config.tiene_secuencia ? t('sequence_action') : t('record_action')}>
                            <Button
                              size="xs" variant="outline" className={config.tiene_secuencia ? '' : 'borde-del-texto'}
                              style={config.tiene_secuencia ? MARCADO : undefined} disabled={!config.activo}
                              aria-label={config.tiene_secuencia
                                ? t('rerecord_bank_aria').replace('{banco}', config.banco_nombre)
                                : t('create_script_bank_aria').replace('{banco}', config.banco_nombre)}
                              onClick={() => (BANCOS_EN_SONDA.some((b) => b.test(config.banco_nombre || '')) ? lanzarSonda(config) : setEligeGuion(config))}
                            >
                              <Video size={15} />
                            </Button>
                          </Tooltip>
                          {/* La credencial va PRIMERA: es lo primero que hay que
                              hacer con una cuenta nueva —sin ella no se puede ni
                              grabar ni descargar— y el orden de los botones es
                              lo único que lo dice (petición del usuario,
                              25/08/2026).
                              Y solo sale UNA de las dos llaves: guardar cuando
                              no hay credencial, revocar cuando la hay. Las dos a
                              la vez obligaban a mirar cuál era cuál para una
                              decisión que ya está tomada (27/08/2026). */}
                          {!conCredencial && (
                            <Tooltip texto={t('create_credential')}>
                              <Button size="xs" variant="outline" className="borde-del-texto" aria-label={t('create_credential')} onClick={() => openCredentialModal(config)} disabled={!config.activo}>
                                <KeyRound size={15} />
                              </Button>
                            </Tooltip>
                          )}
                          {conCredencial && (
                            <Tooltip texto={t('revoke')}>
                              <Button size="xs" variant="outline" className="tachado-diagonal" style={MARCADO} aria-label={t('revoke')} onClick={() => revokeCredential(config)} disabled={!config.activo}>
                                <KeyRound size={15} />
                                {/* La raya, de la esquina de arriba a la izquierda
                                    a la de abajo a la derecha. `preserveAspectRatio
                                    ="none"` la estira a la forma del botón, y
                                    `vector-effect` mantiene el grosor fino aunque
                                    se estire. */}
                                <svg
                                  aria-hidden="true" viewBox="0 0 10 10" preserveAspectRatio="none"
                                  className="pointer-events-none absolute inset-0 h-full w-full"
                                >
                                  <line
                                    x1="0" y1="0" x2="10" y2="10"
                                    stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                                  />
                                </svg>
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip texto={t('renew')}>
                            <Button
                              size="xs" variant="outline" className="borde-del-texto" disabled={!config.activo || !config.tiene_secuencia}
                              aria-label={t('renew')}
                              onClick={() => handleConnect(config.crid)}
                            >
                              <RefreshCw size={15} />
                            </Button>
                          </Tooltip>
                          {/* La papelera es lo único que quita la cuenta de la
                              lista. Antes esta papelera quitaba el login, y por
                              eso se confundía con borrar (27/08/2026). */}
                          <Tooltip texto={t('remove_account')}>
                            <Button size="xs" variant="ghost" className="borde-del-texto" aria-label={t('remove_account')} onClick={() => quitarCuenta(config)}>
                              <Trash2 size={15} />
                            </Button>
                          </Tooltip>
                          <Tooltip texto={t('review')}>
                            <Button
                              size="xs" variant="outline" className="borde-del-texto" disabled={!config.tiene_secuencia}
                              aria-label={t('review')}
                              onClick={() => setEditando(config)}
                            >
                              <ListChecks size={15} />
                            </Button>
                          </Tooltip>
                          {/* Cargar un extracto bajado a mano. No depende del
                              guion: sirve precisamente para los bancos que aún
                              no lo tienen. */}
                          <Tooltip texto={t('upload_short', 'Cargar extracto')}>
                            <Button
                              size="xs" variant="outline" className="borde-del-texto"
                              disabled={!config.activo || Boolean(cargando[config.crid])}
                              aria-label={t('upload_short', 'Cargar extracto')}
                              onClick={() => elegirExtracto(config)}
                            >
                              {cargando[config.crid] ? <Spinner size="xs" /> : <Upload size={15} />}
                            </Button>
                          </Tooltip>
                          {/* Sin guion grabado no hay descarga posible: el botón
                              se apaga y el tooltip dice qué falta, en vez de
                              dejar que el usuario lo pulse y reciba un error. */}
                          <Tooltip texto={config.tiene_secuencia ? t('download') : t('missing_sequence')}>
                            <Button
                              size="xs" variant="outline" className="borde-del-texto" disabled={!config.activo || !config.tiene_secuencia}
                              aria-label={t('download')}
                              onClick={() => abrirDescarga(config)}
                            >
                              <Download size={15} />
                            </Button>
                          </Tooltip>
                          <Tooltip texto={t('history')}>
                            <Button size="xs" variant="outline" className="borde-del-texto" aria-label={t('history')} onClick={() => navigate(`/tesoreria/extractos/logs?crid=${config.crid}&banco=${encodeURIComponent(config.banco_nombre || '')}`)}>
                              <Rows3 size={15} />
                            </Button>
                          </Tooltip>
                          <Tooltip texto={t('compare_steps', 'Comparar pasos')}>
                            <Button size="xs" variant="outline" className="borde-del-texto" aria-label={t('compare_steps', 'Comparar pasos')} onClick={() => setComparar(config)}>
                              <Images size={15} />
                            </Button>
                          </Tooltip>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tight">{config.banco_nombre}</span>
                        <span className="text-xs font-bold opacity-80">{config.cuenta_alias}</span>
                      </div>
                      {!config.activo && <div className="mt-1"><Badge variant="neutral">{t('inactive')}</Badge></div>}
                    </td>

                    <td className="px-5 py-2">
                      <div className="flex flex-col gap-0.5">
                        {/* El IBAN identifica la cuenta mejor que cualquier alias, y
                            aquí acompaña a la cifra que describe. En blanco normal:
                            atenuarlo lo volvía ilegible con lupa. */}
                        <span className="font-mono text-xs">{config.iban}</span>
                        <span className="font-mono text-base font-black">
                          {saldo || <span className="font-sans text-[11px] font-bold uppercase tracking-widest">{t('no_balance')}</span>}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-2 text-sm">
                      {config.ultima_sinc
                        ? <span className="font-bold">{new Date(config.ultima_sinc).toLocaleString('es-ES')}</span>
                        : <span className="text-[11px] font-bold uppercase tracking-widest">{t('never')}</span>}
                    </td>

                    <td className="px-5 py-2 text-sm">
                      {conCredencial
                        ? <span title={t('credential_shared_from').replace('{banco}', config.banco_nombre)} className="flex items-center gap-1.5 font-bold"><KeyRound size={14} />{config.usuario_enmascarado || t('credential_configured')}</span>
                        : <Badge variant="warning">{t('credential_missing')}</Badge>}
                    </td>

                    <td className="px-5 py-2 text-sm">
                      {config.programado
                        ? (
                          <span className="flex items-center gap-1.5 font-black">
                            <CalendarClock size={15} className="text-success" />
                            {t('yes')} · {String(config.hora_programada || '09:30').slice(0, 5)}
                          </span>
                        )
                        : <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"><CalendarOff size={15} /> {t('no')}</span>}
                    </td>

                  </tr>
                );
              })}

              {visibles.length === 0 && configs.length > 0 && (
                <tr className="bg-surface2">
                  <td colSpan="6" className="px-5 py-16 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-widest">
                      {t('no_accounts_for_bank').replace('{banco}', bancoFiltro)}
                    </p>
                  </td>
                </tr>
              )}

              {/* El vacío no es una fila de datos: se queda en el color de la
                  superficie, no en el de la tabla. */}
              {configs.length === 0 && (
                <tr className="bg-surface2">
                  <td colSpan="6" className="px-5 py-16 text-center">
                    <Download size={40} className="mx-auto mb-3" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">{t('no_configs')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Qué hace cada botón (26/09/2026) ─────────────────────────────
          Una línea por botón: su icono, su nombre y para qué sirve. Los textos
          salen del diccionario, contexto Extractos. */}
      <Card className="mt-6 p-5">
        <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest">{t('buttons_legend_title', 'Qué hace cada botón')}</h2>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-2">
          {[
            { icono: <CalendarClock size={15} />, nombre: `${t('autodownload')} / ${t('remove_autodownload')}`, texto: t('help_autodownload', 'Descarga la cuenta sola cada día laborable a la hora programada. Otra vez: la quita.') },
            { icono: <Video size={15} />, nombre: `${t('record_action')} / ${t('sequence_action')}`, texto: t('help_record', 'Graba el guion: cómo entrar en el banco y llegar hasta la descarga.') },
            { icono: <KeyRound size={15} />, nombre: t('create_credential'), texto: t('help_credential', 'Guarda el usuario y la clave del banco para que ALKIM pueda entrar solo.') },
            { icono: <span className="relative inline-flex"><KeyRound size={15} /><svg aria-hidden="true" viewBox="0 0 10 10" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg></span>, nombre: t('revoke'), texto: t('help_revoke', 'Permite ver, editar o quitar la credencial guardada del banco. Si se quita, ALKIM deja de poder entrar en el banco.') },
            { icono: <RefreshCw size={15} />, nombre: t('renew'), texto: t('help_login', 'Entra en el banco y sale sin descargar: deja la sesión abierta y comprueba que el acceso funciona.') },
            { icono: <Trash2 size={15} />, nombre: t('remove_account'), texto: t('help_remove', 'Quita la cuenta de la lista de descargas y borra su guion y su sesión. Los movimientos se quedan.') },
            { icono: <ListChecks size={15} />, nombre: t('review'), texto: t('help_review', 'Abre el guion grabado para quitar pasos o reasignar fechas sin volver a grabar.') },
            { icono: <Upload size={15} />, nombre: t('upload_short', 'Cargar extracto'), texto: t('help_upload', 'Importa un extracto bajado a mano (PDF, Excel o Norma 43) y lo guarda como los descargados.') },
            { icono: <Download size={15} />, nombre: t('download'), texto: t('help_download', 'Baja los movimientos del banco e importa los nuevos. Pregunta desde qué fecha.') },
            { icono: <Rows3 size={15} />, nombre: t('history'), texto: t('help_history', 'Lista las descargas y cargas de la cuenta con su resultado.') },
            { icono: <Images size={15} />, nombre: t('compare_steps', 'Comparar pasos'), texto: t('help_compare', 'Fotos de cada paso de la última descarga buena al lado de las del último fallo, con las diferencias marcadas en rojo.') },
            { icono: <LogOut size={15} />, nombre: t('close_window'), texto: t('help_close_window', 'Solo si una descarga dejó la ventana del banco abierta: la cierra.') },
          ].map((b) => (
            <li key={b.nombre} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 border-border">{b.icono}</span>
              <span><span className="font-black text-on-background">{b.nombre}:</span> {b.texto}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── ¿Desde cuándo? ──────────────────────────────────────────────
          Lo normal es continuar desde la última descarga: una ventana corta
          pasa desapercibida, y hay bancos que piden un 2FA cuando se les
          consulta un periodo largo. Pero al dar de alta una cuenta —o para
          rellenar un hueco— hace falta pedir un tramo largo una vez, y eso lo
          decide una persona sabiendo lo que puede pasar. */}
      {/* ── ¿Qué guion se graba? (26/09/2026) ───────────────────────────
          Movimientos (la descarga diaria) o justificante fiscal (el PDF para
          Hacienda). Cada uno se guarda en su bloque y no pisa al otro. */}
      {eligeGuion && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-modal-backdrop/80 p-4" role="dialog" aria-modal="true" aria-labelledby="elige-guion-title">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface2 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
                <Video size={22} />
              </div>
              <div>
                <h2 id="elige-guion-title" className="text-xl font-black tracking-tight text-on-background">
                  {t('record_which_title', 'Qué guion quieres grabar')}
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-widest">{eligeGuion.banco_nombre} · {eligeGuion.cuenta_alias}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                ['movimientos', t('record_movements', 'Descarga de movimientos'), t('record_movements_hint', 'Entrar, abrir la cuenta y bajar o leer los movimientos.')],
                ['justificante', t('record_receipt', 'Justificante fiscal'), t('record_receipt_hint', 'Entrar y bajar el extracto oficial en PDF para Hacienda.')],
              ].map(([tipo, nombre, ayuda]) => (
                <button
                  key={tipo} type="button"
                  onClick={() => iniciarGrabacion(eligeGuion, tipo)}
                  className="w-full rounded-2xl border-2 border-border bg-surface1 p-4 text-left transition-colors hover:border-primary"
                >
                  <span className="block text-sm font-black text-on-surface1">{nombre}</span>
                  <span className="block text-xs font-bold opacity-80">{ayuda}</span>
                </button>
              ))}
              <Button className="w-full" variant="secondary" onClick={() => setEligeGuion(null)}>
                {t('cancel', 'Cancelar')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {desdeCuando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-modal-backdrop/80 p-4" role="dialog" aria-modal="true" aria-labelledby="desde-title">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface2 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
                <Download size={22} />
              </div>
              <div>
                <h2 id="desde-title" className="text-xl font-black tracking-tight text-on-background">
                  {t('download_account_title').replace('{cuenta}', desdeCuando.cuenta_alias)}
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-widest">{t('from_when')}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* ¿Qué se baja? Los dos por defecto (26/09/2026). Los
                  movimientos alimentan Extractos; los justificantes son los
                  PDF oficiales del banco para Hacienda (Fiscalidad). */}
              <div className="rounded-2xl border border-border bg-surface1 p-4">
                <span className="block text-sm font-black text-on-surface1">{t('what_to_download', 'Qué descargar')}</span>
                {[
                  ['movimientos', t('dl_movements', 'Movimientos'), t('dl_movements_hint', 'Se importan en Extractos.')],
                  ['justificantes', t('dl_receipts', 'Justificantes para Hacienda'), t('dl_receipts_hint', 'PDF oficiales del banco que falten, para Fiscalidad.')],
                ].map(([clave, nombre, ayuda]) => (
                  <label key={clave} className="mt-2 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={queBajar[clave]}
                      onChange={(e) => setQueBajar((q) => ({ ...q, [clave]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-bold text-on-surface1">{nombre}</span>
                      <span className="block text-xs font-bold opacity-80">{ayuda}</span>
                    </span>
                  </label>
                ))}
              </div>

              {/* Solo justificantes: no hay fechas que elegir. */}
              {!queBajar.movimientos && queBajar.justificantes && (
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={() => handleSync(desdeCuando.crid, null, todasDelBanco && hermanasDelBanco.length > 0)}
                >
                  <Download size={15} /> {t('download_receipts_only', 'Descargar justificantes')}
                </Button>
              )}

              {/* ¿Solo esta cuenta, o todas las del banco?
                  Entrar en un banco es lo caro —formulario, a veces 2FA, y
                  siempre un intento que la entidad apunta—. Con varias cuentas
                  en la misma entidad, hacerlas de una en una son varios accesos
                  seguidos cuando la sesión es una sola para todas. */}
              {hermanasDelBanco.length > 0 && (
                <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface1 p-4">
                  <input
                    type="checkbox"
                    checked={todasDelBanco}
                    onChange={(e) => setTodasDelBanco(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-black text-on-surface1">
                      {t('also_sibling_accounts')
                        .replace('{n}', hermanasDelBanco.length)
                        .replace('{banco}', desdeCuando.banco_nombre)}
                    </span>
                    {/* La línea de debajo dice qué va a pasar **con la casilla
                        tal y como está ahora**, no la ventaja en abstracto. Se
                        canceló una descarga a medias por no tener claro que
                        seguirían las demás cuentas (25/08/2026). */}
                    <span className="mt-0.5 block text-xs font-bold opacity-80">
                      {todasDelBanco
                        ? t('one_access_hint').replace('{n}', hermanasDelBanco.length + 1)
                        : t('only_this_account_hint').replace('{cuenta}', desdeCuando.cuenta_alias)}
                    </span>
                  </span>
                </label>
              )}

              {queBajar.movimientos && (<>
              {/* Desde la última descarga: antes el recuadro entero era el
                  botón y no se veía que se podía pulsar. Ahora lleva su botón
                  «Descargar», igual que el de «Desde una fecha» (28/09/2026). */}
              <div className="rounded-2xl border border-border bg-surface1 p-4">
                <span className="block text-sm font-black text-on-surface1">{t('since_last_download')}</span>
                <p className="mt-0.5 text-xs font-bold opacity-80">
                  {desdeCuando.fecha_ultima_consulta
                    ? t('overlap_with_date')
                      .replace('{n}', desdeCuando.dias_solape)
                      .replace('{fecha}', formatFechaCorta(desdeCuando.fecha_ultima_consulta))
                    : t('overlap_no_history').replace('{n}', desdeCuando.dias_solape)}
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSync(desdeCuando.crid, null, todasDelBanco && hermanasDelBanco.length > 0)}
                >
                  <Download size={15} /> {t('download', 'Descargar')}
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-surface1 p-4">
                <label className="block text-sm font-black text-on-surface1">
                  {t('from_date')}
                  <CampoFecha
                    value={fechaManual}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setFechaManual(e.target.value)}
                    className="input-base mt-2 w-full rounded-xl border-border bg-surface2 px-4 py-2 text-sm font-bold"
                  />
                </label>
                <p className="mt-2 text-xs font-bold opacity-80">
                  {t('from_date_hint')}
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  disabled={!fechaManual}
                  onClick={() => handleSync(desdeCuando.crid, fechaManual, todasDelBanco && hermanasDelBanco.length > 0)}
                >
                  <Download size={15} /> {t('download', 'Descargar')}
                </Button>
              </div>
              </>)}
              {!queBajar.movimientos && !queBajar.justificantes && (
                <p className="text-sm font-bold text-destructive-text">{t('dl_choose_one', 'Marca al menos una de las dos.')}</p>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setDesdeCuando(null)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Descarga en cadena: una línea por cuenta ─────────────────────
          Mientras dura, la pantalla no puede seguir «la» descarga porque son
          varias y sus registros van naciendo por turnos. Se enseñan todas, con
          lo que cada una lleva hecho, y al final el resumen de cada una. */}
      {cadena && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-modal-backdrop/80 p-4" role="dialog" aria-modal="true" aria-labelledby="cadena-title">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-border bg-surface2 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
                {cadenaTerminada ? <CheckCircle size={22} strokeWidth={2.75} style={{ color: '#39ff14', filter: 'drop-shadow(0 0 4px #39ff14) drop-shadow(0 0 10px #39ff14)' }} /> : <Spinner size="sm" />}
              </div>
              <div>
                <h2 id="cadena-title" className="text-xl font-black tracking-tight text-on-background">
                  {cadenaTerminada ? t('chain_done_title') : t('chain_title')}
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-widest">
                  {t('chain_subtitle').replace('{n}', cadena.length)}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-surface1 custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <tbody>
                  {cadena.map(({ crid, log }) => {
                    const config = configs.find((c) => c.crid === crid);
                    const enCurso = log && log.status === 'pending';
                    const fallo = log && log.status === 'error';
                    return (
                      <tr key={crid} className="bg-table-row text-on-table-row transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover">
                        <td className="px-5 py-4">
                          <p className="text-sm font-black tracking-tight">
                            {config?.cuenta_alias || t('account_number').replace('{n}', crid)}
                          </p>
                          <p className="mt-0.5 text-xs font-bold opacity-80">
                            {!log && t('queued')}
                            {enCurso && (log.mensaje || t('working'))}
                            {log && !enCurso && (log.mensaje || (fallo ? t('error') : t('completed')))}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!log && <span className="text-[11px] font-bold uppercase tracking-widest">{t('waiting')}</span>}
                          {enCurso && <Spinner size="xs" />}
                          {log && !enCurso && !fallo && (
                            <span className="font-mono text-xs font-bold">
                              {t('chain_counts')
                                .replace('{leidos}', log.leidos ?? 0)
                                .replace('{nuevos}', log.importados ?? 0)}
                            </span>
                          )}
                          {fallo && <AlertCircle size={18} className="ml-auto text-destructive-border" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {!cadenaTerminada && (
                <Button variant="ghost" onClick={() => handleCancel(cadena[0].crid)}>
                  {t('cancel')}
                </Button>
              )}
              <Button
                variant="primary"
                disabled={!cadenaTerminada}
                title={cadenaTerminada ? '' : t('wait_for_all')}
                onClick={() => { setCadena(null); setCadenaTerminada(false); }}
              >
                {t('close')}
              </Button>
            </div>

            {!cadenaTerminada && (
              <p className="mt-3 text-xs font-bold opacity-80">
                {t('chain_cancel_hint')}
              </p>
            )}
          </div>
        </div>
      )}

      {alta && <AltaCuenta onClose={() => setAlta(false)} onCreada={cuentaCreada} />}

      {visor && <VisorExtractos modo={visor} onClose={() => setVisor(null)} />}

      {comparar && <ComparadorPasos cuenta={comparar} onClose={() => setComparar(null)} />}

      {grabacion && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-modal-backdrop/80 p-4" role="dialog" aria-modal="true" aria-labelledby="grabacion-title">
          <Card className="flex max-h-[85vh] w-full max-w-2xl flex-col p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <CircleDot size={26} className="mt-0.5 shrink-0 animate-pulse text-destructive-text" />
              <div className="flex-1">
                <h2 id="grabacion-title" className="text-xl font-bold">
                  {grabacion.fase === 'descarga'
                    ? t('recording_download_title').replace('{banco}', grabacion.banco)
                    : t('recording_access_title').replace('{banco}', grabacion.banco)}
                  {' · '}{grabacion.tipo === 'justificante' ? t('record_receipt', 'Justificante fiscal') : t('record_movements', 'Descarga de movimientos')}
                </h2>
                <p className="text-sm text-on-surface2">
                  {grabacion.fase === 'descarga'
                    ? t('recording_download_hint')
                    : t('recording_access_hint')}
                </p>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={grabacion.fase === 'descarga' ? 'success' : 'info'}>
                {grabacion.fase === 'descarga'
                  ? t('access_recorded').replace('{n}', grabacion.pasosAcceso)
                  : t('phase_1_of_2')}
              </Badge>
              <Badge variant={grabacion.huboDescarga ? 'success' : 'neutral'}>
                {grabacion.huboDescarga
                  ? t('file_badge').replace('{fichero}', grabacion.ficheroDescargado)
                  : t('no_download_yet')}
              </Badge>
              <span className="opacity-60">{t('steps_in_phase').replace('{n}', (grabacion.pasos || []).length)}</span>
            </div>

            {/* En el servidor no hay monitor: el navegador del banco se ve y se
                maneja en una ventana aparte del navegador, a toda pantalla
                (pantalla remota, 27/09/2026). En el PC se abre la de Chrome. */}
            {grabacion.pantallaRemota && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface2 p-3 text-sm">
                <span className="flex-1">{t('remote_screen_hint', 'El navegador del banco está en el servidor y se abre en una ventana aparte. Si no se ha abierto, púlsalo.')}</span>
                <Button variant="primary" onClick={() => abrirPantallaRemota()}>
                  {t('remote_screen_open', 'Abrir el navegador')}
                </Button>
              </div>
            )}

            <div className="min-h-[180px] flex-1 overflow-y-auto rounded-lg border border-border bg-surface2 custom-scrollbar">
              {(grabacion.pasos || []).length === 0 ? (
                <p className="p-8 text-center text-sm opacity-50">
                  {grabacion.iniciando ? t('opening_browser') : t('steps_will_appear')}
                </p>
              ) : (
                <ol className="divide-y divide-border">
                  {grabacion.pasos.map((paso) => (
                    <li key={paso.n} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                      <span className="w-6 shrink-0 text-right font-mono text-xs opacity-40">{paso.n}</span>
                      <span className={`w-24 shrink-0 text-xs font-semibold uppercase
                        ${paso.tipo === 'descargar' ? 'text-success' : 'opacity-60'}`}>
                        {paso.tipo}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{paso.descripcion}</span>
                      {paso.valor !== undefined && paso.valor !== null && (
                        <span className={`shrink-0 font-mono text-xs ${paso.secreto ? 'opacity-50' : ''}`}>
                          {paso.valor}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Aquí no hay botón «Estoy dentro» a propósito: está en la barra
                flotante, dentro de la ventana del banco, que es donde está
                mirando quien graba. Sin esa ventana no se puede entrar, así que
                un segundo botón en esta pantalla solo repetía el de allí. */}
            <p className="mt-3 text-xs text-on-surface2">
              {t('passwords_not_recorded')}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => cancelarGrabacion(grabacion.crid)}>
                {t('cancel')}
              </Button>
              {/* Se puede guardar sin haber exportado nada.
                  Hay bancos donde exportar exige firmar desde el móvil cada vez
                  —CaixaBank—, así que la descarga diaria no puede depender de
                  ello: se para en la lista de movimientos y se leen de la
                  pantalla. Antes el botón estaba apagado hasta que hubiera
                  fichero y no había forma de guardar ese caso (25/08/2026).
                  El aviso de qué se ha grabado sale al terminar. */}
              <Button
                variant="primary"
                disabled={grabacion.fase !== 'descarga'}
                title={grabacion.fase !== 'descarga'
                  ? t('finish_access_first')
                  : grabacion.huboDescarga
                    ? t('save_both_sequences')
                    : t('save_reading_screen')}
                onClick={() => finalizarGrabacion(grabacion.crid)}
              >
                <CheckCircle size={16} /> {t('save_sequences')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {guionGuardado && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-label={t('script_saved_aria')}>
          <Card className="flex max-h-[85vh] w-full max-w-lg flex-col p-6 shadow-xl">
            <div className="mb-4 flex shrink-0 items-start gap-3">
              <FileText size={28} className="shrink-0 text-success" />
              <div>
                <h2 className="text-xl font-bold">{t('sequences_saved')}</h2>
                <p className="text-sm text-on-surface2">
                  {t('sequences_summary')
                    .replace('{acceso}', guionGuardado.pasosAcceso)
                    .replace('{descarga}', guionGuardado.pasosDescarga)}
                  <br />{t('captured_file').replace('{fichero}', guionGuardado.ficheroDescargado)}
                </p>
              </div>
            </div>

            {/* El aviso puede ser muy largo: se desplaza por dentro para que
                los botones nunca queden fuera de la pantalla. */}
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {guionGuardado.camposFecha?.length > 0 && (
              <div className="rounded-lg bg-surface2 p-4 text-sm">
                <p className="mb-2 font-semibold">{t('date_fields_detected')}</p>
                {guionGuardado.camposFecha.map((campo) => (
                  <p key={campo.variable} className="font-mono text-xs">
                    {`{{${campo.variable}}}`} ← &quot;{campo.valor}&quot; en {campo.campo}
                  </p>
                ))}
                <p className="mt-2 text-xs text-on-surface2">
                  {t('date_fields_hint')}
                </p>
              </div>
            )}

            {guionGuardado.avisos?.map((aviso) => (
              <p key={aviso} className="mt-3 flex items-start gap-2 text-sm text-warning">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {aviso}
              </p>
            ))}
            </div>

            <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setGuionGuardado(null)}>{t('close')}</Button>
              {/* Revisar antes de probar: es el momento en que se recuerda qué
                  clics sobraron. Después de cerrar este aviso se olvida. */}
              <Button
                variant="secondary"
                onClick={() => {
                  const crid = guionGuardado.crid;
                  const banco = configs.find((c) => c.crid === crid)?.banco_nombre || '';
                  setGuionGuardado(null);
                  setEditando({ crid, banco_nombre: banco });
                }}
              >
                <ListChecks size={16} /> {t('review_steps')}
              </Button>
              <Button
                variant="primary"
                onClick={() => { const crid = guionGuardado.crid; setGuionGuardado(null); handleSync(crid); }}
              >
                <Download size={16} /> {t('test_now')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {quitarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-labelledby="quitar-title">
          <Card className="w-full max-w-lg p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <Trash2 size={28} className="shrink-0" />
              <div>
                <h2 id="quitar-title" className="text-xl font-bold">{t('remove_title', 'Vas a quitar la cuenta de la descarga automática')}</h2>
                <p className="text-sm font-semibold">{quitarModal.banco_nombre} · {quitarModal.cuenta_alias}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">{t('remove_keeps_title', 'Se conserva:')}</p>
                <p>{t('remove_keeps', 'La cuenta bancaria, sus movimientos y la credencial del banco (usuario y clave).')}</p>
              </div>
              <div>
                <p className="font-semibold">{t('remove_deletes_title', 'Se borra:')}</p>
                <p>{t('remove_deletes', 'El guion grabado (habrá que volver a grabarlo), la sesión del navegador (el banco puede volver a pedir un código) y el historial de descargas.')}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setQuitarModal(null)}>{t('cancel')}</Button>
              <Button type="button" variant="danger" onClick={confirmarQuitarCuenta}><Trash2 size={16} /> {t('confirm_button', 'Confirmar')}</Button>
            </div>
          </Card>
        </div>
      )}

      {credentialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-labelledby="credential-title">
          <Card className="w-full max-w-lg p-6 shadow-xl">
            <div className="mb-5 flex items-start gap-3">
              <KeyRound size={28} className="shrink-0" />
              <div>
                <h2 id="credential-title" className="text-xl font-bold">{editandoCredencial ? t('edit_credential') : t('credential_title')}</h2>
                <p className="text-sm text-on-surface2">{t('credential_desc').replace('{banco}', credentialModal.banco_nombre)}</p>
              </div>
            </div>
            <p className="mb-4 rounded border border-border px-3 py-2 text-sm">{t('credential_order_note')}</p>
            <form onSubmit={saveCredential} className="space-y-4">
              <label className="block text-sm font-medium">{t('bank_username')}
                <input autoComplete="off" required={!yaHayCredencial || editandoCredencial} maxLength={150} value={credentialForm.username} onChange={(e) => setCredentialForm(p => ({ ...p, username: e.target.value }))} className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-on-surface1" />
              </label>
              {/* Con el ojo para poder verla, igual que en la pantalla de
                  entrar a ALKIM. Una contraseña de banco es larga y se teclea a
                  ciegas: si se cuela una errata no se sabe hasta que el banco
                  rechaza el acceso, y para entonces ya no se puede comparar con
                  lo que se quiso escribir (petición del usuario, 25/08/2026). */}
              <PasswordInput
                name="password"
                label={t('bank_password')}
                autoComplete="new-password"
                required={!yaHayCredencial || editandoCredencial}
                maxLength={300}
                value={credentialForm.password}
                onChange={(e) => setCredentialForm(p => ({ ...p, password: e.target.value }))}
              />
              {/* 3.ª y 4.ª credencial (02/10/2026). La 3.ª es la clave de firma
                  que Ruralvía pide por posiciones (en ING, la fecha de
                  nacimiento). Lo que se deja en blanco se conserva. */}
              <PasswordInput
                name="clave3"
                label={t('bank_key3')}
                autoComplete="new-password"
                maxLength={300}
                value={credentialForm.clave3}
                onChange={(e) => setCredentialForm(p => ({ ...p, clave3: e.target.value }))}
              />
              <PasswordInput
                name="clave4"
                label={t('bank_key4')}
                autoComplete="new-password"
                maxLength={300}
                value={credentialForm.clave4}
                onChange={(e) => setCredentialForm(p => ({ ...p, clave4: e.target.value }))}
              />
              {yaHayCredencial && !editandoCredencial && <p className="text-xs text-on-surface2">{t('credential_keep_hint')}</p>}
              <p className="text-xs text-on-surface2">{t('credential_replace_hint')}</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCredentialModal(null)}>{t('cancel')}</Button>
                <Button type="submit" variant="primary" disabled={savingCredential}>{savingCredential ? <Spinner size="sm" /> : <ShieldCheck size={16} />} {t('save_securely')}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-labelledby="revoke-title">
          <Card className="w-full max-w-lg p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <KeyRound size={28} className="shrink-0" />
              <div>
                <h2 id="revoke-title" className="text-xl font-bold">{t('revoke')}</h2>
                <p className="text-sm text-on-surface2">{revokeModal.config.banco_nombre}. {t('revoke_confirm')}</p>
              </div>
            </div>
            {!revokeModal.datos && !revokeModal.error && <div className="flex justify-center py-6"><Spinner /></div>}
            {revokeModal.error && (
              <p className="rounded border border-destructive px-3 py-2 text-sm text-destructive" role="alert">{revokeModal.error}</p>
            )}
            {revokeModal.datos && (
              <dl className="space-y-3">
                {[
                  ['bank_username', 'credencial1'],
                  ['bank_password', 'credencial2'],
                  ['bank_key3', 'credencial3'],
                  ['bank_key4', 'credencial4'],
                ].map(([etiqueta, campo]) => (
                  <div key={campo}>
                    <dt className="text-sm font-medium">{t(etiqueta)}</dt>
                    <dd className="mt-1 rounded border border-border bg-input px-3 py-2 font-mono text-base text-on-surface1 break-all">
                      {revokeModal.datos[campo] || '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRevokeModal(null)} disabled={revoking}>{t('cancel')}</Button>
              <Button type="button" variant="primary" onClick={editCredential} disabled={revoking || !revokeModal.datos}>{t('edit_credential_btn')}</Button>
              <Button type="button" variant="destructive" onClick={confirmRevoke} disabled={revoking}>
                {revoking ? <Spinner size="sm" /> : t('delete_credential_btn')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {twoFactor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-modal-backdrop/80 p-4" role="dialog" aria-modal="true" aria-labelledby="two-factor-title">
          <Card className="w-full max-w-md p-6 shadow-xl">
            <ShieldCheck size={32} className="mb-3" />
            <h2 id="two-factor-title" className="text-xl font-bold">{t('two_factor_title')}</h2>
            <p className="mt-2 text-sm text-on-surface2">
              {twoFactor.type === 'firma'
                ? t('two_factor_firma')
                : twoFactor.type === 'approval'
                  ? t('two_factor_approval')
                  : t('two_factor_code_hint')}
              {' '}{t('two_factor_expires').replace('{hora}', new Date(twoFactor.expiresAt).toLocaleTimeString('es-ES'))}
            </p>
            <form onSubmit={submitTwoFactor} className="mt-5 space-y-4">
              {!['approval', 'firma'].includes(twoFactor.type) && (
                <label className="block text-sm font-medium">{t('two_factor_code_label')}
                  {/* **Letras y números, no solo cifras.**
                      El primer intento filtraba a dígitos dando por hecho que
                      el código del banco era numérico. No lo es: el de ING trae
                      letras, y el filtro las borraba según se tecleaban — el
                      campo parecía bloqueado con el SMS caducando (13/09/2026).
                      Se quitan solo espacios y signos, que es lo que se cuela
                      al pegar desde el móvil. */}
                  <input
                    id="two-factor-code"
                    autoComplete="one-time-code"
                    required
                    minLength={LARGO_MINIMO}
                    maxLength={16}
                    value={twoFactorCode}
                    onChange={(e) => {
                      setTwoFactorCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16));
                      if (twoFactorError) setTwoFactorError(null);
                    }}
                    className={`mt-1 w-full rounded border bg-input px-3 py-3 text-center text-xl tracking-[0.3em] text-on-surface1 ${twoFactorError ? 'border-destructive' : 'border-border'}`}
                    autoFocus
                  />
                  <span className="mt-1 block text-right text-xs font-normal text-on-surface2">
                    {twoFactorCode.length}
                  </span>
                </label>
              )}
              {twoFactorError && (
                <p className="rounded border border-destructive px-3 py-2 text-sm text-destructive" role="alert">
                  {twoFactorError}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => handleCancel(twoFactor.crid)}>
                  {t('cancel_download_btn')}
                </Button>
                {/* Deshabilitado hasta tener dígitos suficientes: enviar a
                    medias gasta el SMS y no hay segundo intento. */}
                <Button
                  type="submit"
                  className="flex-1"
                  variant="primary"
                  disabled={submittingTwoFactor || (!['approval', 'firma'].includes(twoFactor.type) && twoFactorCode.length < LARGO_MINIMO)}
                >
                  {submittingTwoFactor ? <Spinner size="sm" /> : twoFactor.type === 'firma' ? t('already_signed') : twoFactor.type === 'approval' ? t('already_approved') : t('verify')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {syncResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-label={t('sync_result_aria')}>
          <Card className="w-full max-w-lg p-6 shadow-xl">
            {syncResult.status === 'success' ? (
              <>
                <div className="mb-4 flex items-start gap-3 text-on-surface1">
                  {/* Verde fluorescente que brille (03/10/2026, petición del usuario). */}
                  <CheckCircle size={28} strokeWidth={2.75} className="shrink-0" style={{ color: '#39ff14', filter: 'drop-shadow(0 0 4px #39ff14) drop-shadow(0 0 10px #39ff14)' }} />
                  <div>
                    <h2 className="text-xl font-bold">
                      {syncResult.credential ? t('credential_protected') : syncResult.connection ? t('session_renewed') : syncResult.manual ? t('upload_completed') : t('download_completed')}
                    </h2>
                    <p className="text-sm">{syncResult.log.mensaje}</p>
                  </div>
                </div>
                {!syncResult.connection && !syncResult.credential && (
                  <dl className="grid grid-cols-2 gap-4 rounded-lg bg-surface2 p-4 text-on-surface1">
                    <div><dt className="text-xs uppercase">{t('balance')}</dt><dd className="font-mono font-bold">{formatSaldoConFecha(syncResult.log.saldo_final, syncResult.log.saldo_fecha) || '—'}</dd></div>
                    <div><dt className="text-xs uppercase">{t('stat_read')}</dt><dd className="font-bold">{syncResult.log.leidos || 0}</dd></div>
                    <div><dt className="text-xs uppercase">{t('stat_added')}</dt><dd className="font-bold">{syncResult.log.importados || 0}</dd></div>
                    <div><dt className="text-xs uppercase">{t('stat_duplicates')}</dt><dd className="font-bold">{syncResult.log.duplicados || 0}</dd></div>
                    <div><dt className="text-xs uppercase">{t('stat_rejected')}</dt><dd className="font-bold">{syncResult.log.rechazados || 0}</dd></div>
                    {/* Con la fecha en crudo salía `2026-07-08T22:00:00.000Z`, que
                        además de ilegible engaña: las 22:00 UTC son las 00:00 del
                        día siguiente en Madrid, así que quien lo lea entiende un
                        día menos. `formatFechaCorta` lo pasa a hora local. */}
                    <div><dt className="text-xs uppercase">{t('stat_range')}</dt><dd className="font-bold">{formatFechaCorta(syncResult.log.fecha_desde) || '—'} · {formatFechaCorta(syncResult.log.fecha_hasta) || '—'}</dd></div>
                  </dl>
                )}
              </>
            ) : (
              <div className="mb-4 flex items-start gap-3 text-on-surface1">
                <AlertCircle size={28} className="shrink-0 text-destructive-text" />
                <div>
                  <h2 className="text-xl font-bold">{t('could_not_complete')}</h2>
                  <p className="text-sm">{syncResult.log?.mensaje || t('see_history_reason')}</p>
                </div>
              </div>
            )}
            {/* Guardar una credencial no descarga nada: no hay historial que
                ver. Solo «Cerrar», y se queda en Extractos. Antes el botón
                principal era «Ver historial» y, al pulsarlo por inercia, sacaba
                al usuario de la pantalla donde estaba (29/09/2026). */}
            {syncResult.status === 'success' && syncResult.credential ? (
              <div className="mt-6 flex justify-end">
                <Button variant="primary" onClick={() => setSyncResult(null)}>{t('close')}</Button>
              </div>
            ) : (
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setSyncResult(null)}>{t('close')}</Button>
              <Button
                variant="primary"
                onClick={() => navigate(syncResult.status === 'success' && !syncResult.connection && !syncResult.credential
                  ? '/tesoreria/movimientos'
                  : `/tesoreria/extractos/logs?crid=${syncResult.crid}`)}
              >
                {syncResult.status === 'success' && !syncResult.connection && !syncResult.credential ? t('view_movements') : t('view_history')}
              </Button>
            </div>
            )}
          </Card>
        </div>
      )}
      {editando && (
        <EditorSecuencia
          crid={editando.crid}
          banco={editando.banco_nombre}
          onCerrar={() => setEditando(null)}
          onGuardado={() => fetchConfigs()}
        />
      )}

    </div>
  );
};

export default ExtractosPage;
