'use client';

import { useState, useEffect } from 'react';
import { formatearFecha, formatearHora } from '../utils/formateo';
import ModalNotificacion from './Modal';

export default function ModalFormulario({ isOpen, onClose, registroEditar, empleado, onRegistroAgregado }) {
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [horaIngreso, setHoraIngreso] = useState('');
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [modal, setModal] = useState({ mostrar: false, mensaje: '', tipo: 'info' });
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    if (registroEditar) {
      // Cargar datos del registro a editar
      setFechaIngreso(registroEditar.fechaIngreso);
      setHoraIngreso(registroEditar.horaIngreso);
      setFechaEgreso(registroEditar.fechaEgreso || '');
      setHoraEgreso(registroEditar.horaEgreso || '');
      setModoEdicion(true);
    } else {
      limpiarFormulario();
      setModoEdicion(false);
    }
  }, [registroEditar, isOpen]);

  const limpiarFormulario = () => {
    setFechaIngreso('');
    setHoraIngreso('');
    setFechaEgreso('');
    setHoraEgreso('');
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();

    if (!fechaIngreso || !horaIngreso) {
      setModal({
        mostrar: true,
        mensaje: 'Por favor complete al menos la fecha y hora de ingreso',
        tipo: 'warning'
      });
      return;
    }

    const registro = {
      empleado,
      fechaIngreso,
      horaIngreso,
      fechaEgreso: fechaEgreso || null,
      horaEgreso: horaEgreso || null,
      temporal: !fechaEgreso || !horaEgreso
    };

    try {
      let response;
      if (modoEdicion) {
        // Actualizar registro existente
        response = await fetch('/api/registros', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empleado,
            tipo: 'actualizarRegistro',
            id: registroEditar.id,
            ...registro
          })
        });
      } else {
        // Crear nuevo registro
        response = await fetch('/api/registros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registro)
        });
      }

      if (response.ok) {
        setModal({
          mostrar: true,
          mensaje: modoEdicion ? 'Registro actualizado correctamente' : 'Registro agregado correctamente',
          tipo: 'success'
        });
        limpiarFormulario();
        setTimeout(() => {
          onRegistroAgregado();
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setModal({
          mostrar: true,
          mensaje: error.error || 'Error al procesar el registro',
          tipo: 'error'
        });
      }
    } catch (error) {
      setModal({
        mostrar: true,
        mensaje: 'Error de conexión',
        tipo: 'error'
      });
    }
  };

  const handleClose = () => {
    limpiarFormulario();
    setModoEdicion(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/30 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            {modoEdicion ? '✏️ Editar Registro' : '📝 Nuevo Registro Manual'}
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={manejarEnvio} className="p-6 space-y-6">
          {/* Ingreso */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              ▶️ Ingreso
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Fecha de Ingreso *
                </label>
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="w-full min-w-0 px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white text-gray-900 text-sm"
                  required
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🕐 Hora de Ingreso *
                </label>
                <input
                  type="time"
                  value={horaIngreso}
                  onChange={(e) => setHoraIngreso(e.target.value)}
                  className="w-full min-w-0 px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white text-gray-900 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Egreso */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
              ⏹️ Egreso (Opcional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Fecha de Egreso
                </label>
                <input
                  type="date"
                  value={fechaEgreso}
                  onChange={(e) => setFechaEgreso(e.target.value)}
                  className="w-full min-w-0 px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white text-gray-900 text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🕐 Hora de Egreso
                </label>
                <input
                  type="time"
                  value={horaEgreso}
                  onChange={(e) => setHoraEgreso(e.target.value)}
                  className="w-full min-w-0 px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white text-gray-900 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-lg"
            >
              ❌ Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              {modoEdicion ? '💾 Actualizar' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>

      {modal.mostrar && (
        <ModalNotificacion
          isOpen={modal.mostrar}
          title={modal.tipo === 'success' ? 'Éxito' : modal.tipo === 'error' ? 'Error' : modal.tipo === 'warning' ? 'Advertencia' : 'Información'}
          message={modal.mensaje}
          type={modal.tipo}
          onClose={() => setModal({ ...modal, mostrar: false })}
        />
      )}
    </div>
  );
}
