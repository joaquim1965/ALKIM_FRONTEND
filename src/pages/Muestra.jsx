import React from "react";
import { useTmTr } from "../contexts/TmTrContext";

// Componentes UI
import Tabs from "../components/UI/Tabsv1";
import Button from "../components/UI/Button";

const Muestra = () => {
  // Extraemos las traducciones del contexto
  const { t } = useTmTr('Muestra');

  // Contenido para cada pestaña
  const tabContent = [
    // Tab 1: Dos botones lado a lado
    <div className="flex space-x-4" key="tab1">
      <Button onClick={() => alert(t('Parrafo2'))}>{t('Botón1')}</Button>
      <Button onClick={() => alert(t('Parrafo3'))}>{t('Botón2')}</Button>
    </div>,

    // Tab 2: Formulario básico con dos preguntas
    <form className="space-y-4" key="tab2">
      <div>
        <label className="block text-on-background font-medium" htmlFor="pregunta1">
          {t('Pregunta1')}
        </label>
        <input
          id="pregunta1"
          type="text"
          className="mt-1 block w-full bg-input text-on-input border-input-border border rounded-md p-2 focus:outline-none focus:ring-2"
          placeholder={t('Parrafo4')}
        />
      </div>
      <div>
        <label className="block text-on-background font-medium" htmlFor="pregunta2">
          {t('Pregunta2')}
        </label>
        <textarea
          id="pregunta2"
          className="mt-1 block w-full bg-input text-on-input border-input-border border rounded-md p-2 focus:outline-none focus:ring-2"
          placeholder={t('Parrafo4')}
        ></textarea>
      </div>
      <Button type="submit">{t('Enviar')}</Button>
    </form>,

    // Tab 3: Tabla pequeña con 3 filas y 4 columnas
    <div className="overflow-x-auto" key="tab3">
      <table className="min-w-full bg-background border-border border">
        <thead className="bg-table-header">
          <tr>
            <th className="py-2 px-4 text-on-table-header border-border border-b">{t('Columna1')}</th>
            <th className="py-2 px-4 text-on-table-header border-border border-b">{t('Columna2')}</th>
            <th className="py-2 px-4 text-on-table-header border-border border-b">{t('Columna3')}</th>
            <th className="py-2 px-4 text-on-table-header border-border border-b">{t('Columna4')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-background">
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
          </tr>
          <tr className="bg-table-row-striped">
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background border-border border-b">{t('Parrafo1')}</td>
          </tr>
          <tr className="bg-background">
            <td className="py-2 px-4 text-on-background">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background">{t('Parrafo1')}</td>
            <td className="py-2 px-4 text-on-background">{t('Parrafo1')}</td>
          </tr>
        </tbody>
      </table>
    </div>,
  ];

  // Títulos de las pestañas
  const tabTitles = [t('Botones'), t('Formulario'), t('Tabla')];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4 text-on-background">
        {t('Parrafo1')}
      </h1>
      <Tabs tabs={tabTitles} content={tabContent} />
    </div>
  );
};

export default Muestra;
