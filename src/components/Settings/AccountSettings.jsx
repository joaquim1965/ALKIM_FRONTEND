import React, { useState } from 'react';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';
import AccountSettingsStyled from './AccountSettingsStyled';

/**
 * AccountSettings
 * 
 * Componente ESTÁNDAR para la configuración de la cuenta.
 * Gestiona el estado local del formulario y la lógica de validación.
 */
const AccountSettings = () => {
  const { t } = useTmTr('AccountSettings');
  const { user } = useStore();
  
  // Estado inicial basado en el usuario (mock si no existe)
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    usuario: user?.usuario || '',
    prefijo_tel: user?.prefijo_tel || '+34',
    telefono: user?.telefono || '',
    avatar: null,
  });

  // Sincronizar con el store (F5 Fix)
  React.useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        usuario: user.usuario || '',
        prefijo_tel: user.prefijo_tel || '+34',
        telefono: user.telefono || '',
        avatar: null,
      });
    }
  }, [user]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.usuario) newErrors.usuario = 'El nombre de usuario es obligatorio';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setLoading(true);
    // Simulación de guardado (Mock)
    setTimeout(() => {
      setLoading(false);
      alert('¡Ajustes guardados correctamente! (Este es un prototipo visual)');
    }, 1000);
  };

  const handleCancel = () => {
    // Resetear al estado inicial si fuera necesario
    window.location.reload(); 
  };

  return (
    <AccountSettingsStyled
      formData={formData}
      onChange={handleChange}
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
      errors={errors}
      t={t}
    />
  );
};

export default AccountSettings;
