'use client';

import { useState, useEffect } from 'react';
import ModalNotificacion from './Modal';

export default function Configuracion({ configuracion, empleado, onConfiguracionActualizada }) {
  const [valorHora, setValorHora] = useState('');
  const [valorViatico, setValorViatico] = useState('');
  const [valorAdicional, setValorAdicional] = useState('');
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    setValorHora(configuracion?.valorHora || '');
    setValorViatico(configuracion?.valorViatico || '');
    setValorAdicional(configuracion?.valorAdicional || '');
  }, [configuracion]);

  const actualizarConfiguracion = async () => {
    try {
      const response = await fetch('/api/registros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado,
          tipo: 'configuracion',
          valorHora: parseFloat(valorHora) || 0,
          valorViatico: parseFloat(valorViatico) || 0,
          valorAdicional: parseFloat(valorAdicional) || 0
        })
      });
      
      if (response.ok) {
        onConfiguracionActualizada();
        setModal({
          isOpen: true,
          title: 'Éxito',
          message: 'Configuración actualizada correctamente',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo actualizar la configuración',
        type: 'error'
      });
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">Configuración</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor por Hora ($)
          </label>
          <input
            type="number"
            value={valorHora}
            onChange={(e) => setValorHora(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Viático por Día ($)
          </label>
          <input
            type="number"
            value={valorViatico}
            onChange={(e) => setValorViatico(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Adicional por Defecto ($)
          </label>
          <input
            type="number"
            value={valorAdicional}
            onChange={(e) => setValorAdicional(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            step="0.01"
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <button
            onClick={actualizarConfiguracion}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium inline-flex items-center justify-center"
          >
            <span className="mr-2">💾</span>
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>

    <ModalNotificacion
      isOpen={modal.isOpen}
      onClose={() => setModal({ ...modal, isOpen: false })}
      title={modal.title}
      message={modal.message}
      type={modal.type}
    />
  </>
  );
}