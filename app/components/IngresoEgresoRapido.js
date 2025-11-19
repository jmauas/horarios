'use client';

import { useState } from 'react';
import { formatearFechaHora } from '../utils/formateo';
import ModalNotificacion, { ModalConfirmacion } from './Modal';

export default function IngresoEgresoRapido({ empleado, onRegistroAgregado }) {
  const [modalConfirmIngreso, setModalConfirmIngreso] = useState({ isOpen: false, fechaHora: '' });
  const [modalConfirmEgreso, setModalConfirmEgreso] = useState({ isOpen: false, fechaHora: '' });
  const [modalNotif, setModalNotif] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const obtenerFechaHoraActual = () => {
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);
    return { fecha, hora };
  };

  const abrirModalIngreso = () => {
    const { fecha, hora } = obtenerFechaHoraActual();
    setModalConfirmIngreso({ 
      isOpen: true, 
      fecha,
      hora,
      fechaHora: formatearFechaHora(fecha, hora)
    });
  };

  const abrirModalEgreso = () => {
    const { fecha, hora } = obtenerFechaHoraActual();
    setModalConfirmEgreso({ 
      isOpen: true, 
      fecha,
      hora,
      fechaHora: formatearFechaHora(fecha, hora)
    });
  };

  const confirmarIngreso = async () => {
    try {
      const response = await fetch('/api/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado,
          fechaIngreso: modalConfirmIngreso.fecha,
          horaIngreso: modalConfirmIngreso.hora,
          fechaEgreso: '',
          horaEgreso: '',
          temporal: true
        })
      });

      if (response.ok) {
        onRegistroAgregado();
        setModalConfirmIngreso({ isOpen: false, fechaHora: '' });
        setModalNotif({
          isOpen: true,
          title: 'Éxito',
          message: 'Ingreso registrado correctamente',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error al registrar ingreso:', error);
      setModalNotif({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo registrar el ingreso',
        type: 'error'
      });
    }
  };

  const confirmarEgreso = async () => {
    try {
      const response = await fetch('/api/registros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado,
          tipo: 'completarEgreso',
          fechaEgreso: modalConfirmEgreso.fecha,
          horaEgreso: modalConfirmEgreso.hora
        })
      });

      if (response.ok) {
        onRegistroAgregado();
        setModalConfirmEgreso({ isOpen: false, fechaHora: '' });
        setModalNotif({
          isOpen: true,
          title: 'Éxito',
          message: 'Egreso registrado correctamente',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error al registrar egreso:', error);
      setModalNotif({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo registrar el egreso',
        type: 'error'
      });
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">Registro Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={abrirModalIngreso}
            className="w-full bg-green-600 text-white px-6 py-6 sm:py-8 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg sm:text-xl shadow-lg active:scale-95 transform"
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-4xl">▶️</span>
              <span>REGISTRAR INGRESO</span>
              <span className="text-sm opacity-90">Fecha y hora actual</span>
            </div>
          </button>
          
          <button
            onClick={abrirModalEgreso}
            className="w-full bg-red-600 text-white px-6 py-6 sm:py-8 rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg sm:text-xl shadow-lg active:scale-95 transform"
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-4xl">⏹️</span>
              <span>REGISTRAR EGRESO</span>
              <span className="text-sm opacity-90">Fecha y hora actual</span>
            </div>
          </button>
        </div>
      </div>

      {/* Modal de confirmación de ingreso */}
      <ModalConfirmacion
        isOpen={modalConfirmIngreso.isOpen}
        title="Confirmar Ingreso"
        message={
          <div>
            <p className="mb-2">¿Confirmar registro de ingreso?</p>
            <div className="bg-gray-100 p-3 rounded-md mt-3">
              <p className="font-semibold text-gray-900">Fecha y hora: {modalConfirmIngreso.fechaHora}</p>
            </div>
          </div>
        }
        onConfirm={confirmarIngreso}
        onClose={() => setModalConfirmIngreso({ isOpen: false, fechaHora: '' })}
      />

      {/* Modal de confirmación de egreso */}
      <ModalConfirmacion
        isOpen={modalConfirmEgreso.isOpen}
        title="Confirmar Egreso"
        message={
          <div>
            <p className="mb-2">¿Confirmar registro de egreso?</p>
            <div className="bg-gray-100 p-3 rounded-md mt-3">
              <p className="font-semibold text-gray-900">Fecha y hora: {modalConfirmEgreso.fechaHora}</p>
            </div>
          </div>
        }
        onConfirm={confirmarEgreso}
        onClose={() => setModalConfirmEgreso({ isOpen: false, fechaHora: '' })}
      />

      {/* Modal de notificación */}
      <ModalNotificacion
        isOpen={modalNotif.isOpen}
        onClose={() => setModalNotif({ ...modalNotif, isOpen: false })}
        title={modalNotif.title}
        message={modalNotif.message}
        type={modalNotif.type}
      />
    </>
  );
}
