/**
 * SQLEditor.jsx
 *
 * Editor de consultas SQL con líneas numeradas
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Code } from 'lucide-react';
import { useTmTr } from '../../contexts/TmTrContext';
const translations = new Proxy({}, { get: (_, prop) => prop });

export function SQLEditor({ value, onChange, onExecute, disabled = false }) {
  const { t } = useTmTr('SqlConsole');
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // Manejar Ctrl+Enter para ejecutar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (onExecute && !disabled) {
          onExecute();
        }
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
      return () => textarea.removeEventListener('keydown', handleKeyDown);
    }
  }, [onExecute, disabled]);

  // Manejar Tab para indentar
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Restaurar posición del cursor
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lineCount = value.split('\n').length;

  // Sincronizar scroll entre textarea y números de línea
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  return (
    <div className="h-full bg-surface1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Code size={16} className="text-secondary" />
        <span className="text-sm font-medium text-on-surface1">
          SQL Editor
        </span>
        <span className="ml-auto text-xs text-secondary">
          Separa consultas con <code className="bg-surface2 px-1 rounded font-mono">;</code> · Ctrl+Enter para ejecutar
        </span>
      </div>

      {/* Editor with line numbers */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="bg-surface2 px-3 py-3 text-right text-xs text-secondary font-mono select-none border-r border-border overflow-hidden"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder={t(translations.editorPlaceholder)}
          disabled={disabled}
          className="flex-1 px-4 py-3 bg-surface1 text-on-surface1 font-mono text-sm leading-6 resize-none focus:outline-none disabled:text-disabled disabled:cursor-not-allowed"
          spellCheck="false"
        />
      </div>
    </div>
  );
}

export default SQLEditor;
