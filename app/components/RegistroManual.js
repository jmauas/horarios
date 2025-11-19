'use client';

import { useState, useEffect } from 'react';
import ModalNotificacion from './Modal';

export default function RegistroManual({ onRegistroAgregado, registroEditar, onEditarCompleto }) {
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [horaIngreso, setHoraIngreso] = useState('');
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    if (registroEditar) {
      setFechaIngreso(registroEditar.fechaIngreso || '');
      setHoraIngreso(registroEditar.horaIngreso || '');
      setFechaEgreso(registroEditar.fechaEgreso || '');
      setHoraEgreso(registroEditar.horaEgreso || '');
      setModoEdicion(true);
    }
  }, [registroEditar]);

  const limpiarFormulario = () => {
    setFechaIngreso('');
    setHoraIngreso('');
    setFechaEgreso('');
    setHoraEgreso('');
    setModoEdicion(false);
    if (onEditarCompleto) onEditarCompleto();
  };

  const agregarRegistro = async (e) => {
    e.preventDefault();
    
    if (!fechaIngreso || !horaIngreso || !fechaEgreso || !horaEgreso) {
      setModal({
        isOpen: true,
        title: 'Campos incompletos',
        message: 'Por favor complete todos los campos',
        type: 'warning'
      });
      return;
    }

    const registro = {
      fechaIngreso,
      horaIngreso,
      fechaEgreso,
      horaEgreso
    };

    try {
      if (modoEdicion && registroEditar) {
        // Actualizar registro existente
        const response = await fetch('/api/registros', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'actualizarRegistro',
            id: registroEditar.id,
            ...registro
          })
        });

        if (response.ok) {
          limpiarFormulario();
          onRegistroAgregado();
          setModal({
            isOpen: true,
            title: 'Éxito',
            message: 'Registro actualizado correctamente',
            type: 'success'
          });
        }
      } else {
        // Crear nuevo registro
        const response = await fetch('/api/registros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registro)
        });

        if (response.ok) {
          limpiarFormulario();
          onRegistroAgregado();
          setModal({
            isOpen: true,
            title: 'Éxito',
            message: 'Registro agregado correctamente',
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Error al procesar registro:', error);
      setModal({
        isOpen: true,
        title: 'Error',
        message: `No se pudo ${modoEdicion ? 'actualizar' : 'agregar'} el registro`,
        type: 'error'
      });
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
            {modoEdicion ? '✏️ Editar Registro' : '📝 Registrar Horario Manualmente'}
          </h2>
          {modoEdicion && (
            <button
              onClick={limpiarFormulario}
              className="inline-flex items-center px-3 py-1 bg-gray-500 text-white text-sm hover:bg-gray-600 transition-colors"
            >
              <span className="mr-1">✖</span>
              Cancelar
            </button>
          )}
        </div>
      <form onSubmit={agregarRegistro} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Ingreso
            </label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Ingreso
            </label>
            <input
              type="time"
              value={horaIngreso}
              onChange={(e) => setHoraIngreso(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Egreso
            </label>
            <input
              type="date"
              value={fechaEgreso}
              onChange={(e) => setFechaEgreso(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Egreso
            </label>
            <input
              type="time"
              value={horaEgreso}
              onChange={(e) => setHoraEgreso(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold inline-flex items-center justify-center"
        >
          <span className="mr-2">{modoEdicion ? '💾' : '➕'}</span>
          {modoEdicion ? 'Actualizar Registro' : 'Agregar Registro Manual'}
        </button>
      </form>
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