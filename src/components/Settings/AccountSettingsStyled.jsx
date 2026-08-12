import React from 'react';
import Input from '../UI/Input';
import PhoneInput from '../UI/PhoneInput';
import Button from '../UI/Button';
import { Camera } from 'lucide-react';

/**
 * AccountSettingsStyled
 * 
 * Versión ESTILIZADA de la configuración de cuenta.
 * Implementa el diseño premium con Tailwind CSS.
 */
const AccountSettingsStyled = ({ 
  formData, 
  onChange, 
  onSave, 
  onCancel, 
  loading,
  errors,
  t 
}) => {
  return (
    <div className="space-y-6">
      {/* Header de la sección */}
      <div>
        <h2 className="text-2xl font-bold text-on-background">
          {t('Ajustesespaciotrabajo') || 'Ajustes de la cuenta'}
        </h2>
        <div className="h-px bg-border mt-2" />
      </div>

      <div className="space-y-5">
        {/* Campo: Nombre de Usuario (NUEVO) */}
        <div className="space-y-1">
          <Input
            label={t('Nombreusuario') || 'Nombre de usuario'}
            placeholder="ej: kimi_dev"
            value={formData.usuario}
            onChange={(e) => onChange('usuario', e.target.value)}
            error={errors.usuario}
            helperText={t('Nombreusuariodesc') || 'Este será tu alias único en la plataforma.'}
            fullWidth
          />
        </div>

        {/* Campos: Nombre y Apellido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('Nombre') || 'Nombre'}
            value={formData.nombre}
            onChange={(e) => onChange('nombre', e.target.value)}
            error={errors.nombre}
            fullWidth
          />
          <Input
            label={t('Apellido') || 'Apellidos'}
            value={formData.apellido}
            onChange={(e) => onChange('apellido', e.target.value)}
            error={errors.apellido}
            fullWidth
          />
        </div>

        {/* Campo: Teléfono (NUEVO - Prefijo + Teléfono) */}
        <div className="space-y-1">
          <PhoneInput
            label={t('Telefonocontacto') || 'Teléfono de contacto'}
            prefixPlaceholder="+34"
            numberPlaceholder="600 000 000"
            prefixName="prefijo_tel"
            numberName="telefono"
            // Mock de React Hook Form para que funcione visualmente sin él
            registerPrefix={{ 
              value: formData.prefijo_tel, 
              onChange: (e) => onChange('prefijo_tel', e.target.value) 
            }}
            registerNumber={{ 
              value: formData.telefono, 
              onChange: (e) => onChange('telefono', e.target.value) 
            }}
            errors={errors}
          />
        </div>

        {/* Sección: Icono / Avatar */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-on-surface1">
            {t('Iconoperfil') || 'Icono de perfil'}
          </label>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-surface2 border border-border flex items-center justify-center overflow-hidden shadow-inner">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {formData.nombre?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-on-primary rounded-xl shadow-lg border-2 border-background hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>
            <div className="text-sm text-secondary max-w-xs">
              {t('Avatardesc') || 'Sube una imagen o elige un avatar. Se mostrará en la barra lateral y notificaciones.'}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border my-6" />

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {t('Cancelar') || 'Cancelar'}
        </Button>
        <Button onClick={onSave} loading={loading}>
          {t('Guardarcambios') || 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
};

export default AccountSettingsStyled;
