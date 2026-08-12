import React, { useState } from 'react';
import { BookOpen, Upload } from 'lucide-react';
import { FileUpload, FilesList } from '../../components/UI';

export default function DocumentacionPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="p-4 md:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <BookOpen className="text-primary" size={28} />
          <div>
            <p className="text-xs text-on-surface2">Documentación</p>
            <h1 className="text-2xl font-semibold text-on-surface1">Archivos</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-on-surface2">
          Sube, consulta y administra los documentos almacenados en ALKIM.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-start">
        <div>
          <div className="flex items-center gap-2 mb-3 text-on-surface1">
            <Upload size={18} className="text-primary" />
            <h2 className="font-semibold">Subir archivo</h2>
          </div>
          <FileUpload onUploaded={() => setRefreshKey((key) => key + 1)} />
        </div>
        <div>
          <h2 className="font-semibold text-on-surface1 mb-3">Archivos guardados</h2>
          <FilesList refreshKey={refreshKey} />
        </div>
      </section>
    </main>
  );
}
