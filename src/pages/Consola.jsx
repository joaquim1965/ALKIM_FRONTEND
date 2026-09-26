import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { useTmTr } from '../contexts/TmTrContext';
import PanelesSaldo from '../components/Saldo/PanelesSaldo';

/**
 * Panel de control (26/08/2026).
 *
 * Es la pantalla que abre el menú en «Panel de control», y hasta hoy estaba
 * vacía. Ahora lleva los tres paneles de Saldo, Gastos e Ingresos: de un
 * vistazo, cómo están las cuentas. Los demás paneles —vencimientos, por
 * conciliar, avisos— caben aquí sin mover nada de lo que ya está.
 */
const Consola = () => {
  const { t } = useTmTr('Saldo');
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-border bg-surface2 text-on-background">
          <LayoutDashboard size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-background">{t('panel')}</h1>
          <p className="text-sm text-on-surface2">{t('panel_sub')}</p>
        </div>
      </div>
      <PanelesSaldo />
    </div>
  );
};

export default Consola;
