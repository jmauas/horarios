'use client';

import { formatearFecha, formatearHora, formatearFechaConDia } from '../utils/formateo';
import { ModalConfirmacion } from './Modal';
import { useState } from 'react';

export default function ListaRegistros({ registros, empleado, onRegistroEliminado, onEditarRegistro }) {
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, id: null });
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Ordenar registros por fecha/hora de ingreso descendente (más recientes primero)
  const registrosOrdenados = [...registros].sort((a, b) => {
    const fechaA = new Date(`${a.fechaIngreso}T${a.horaIngreso}`);
    const fechaB = new Date(`${b.fechaIngreso}T${b.horaIngreso}`);
    return fechaB - fechaA; // Orden descendente
  });

  // Mostrar solo los 5 más recientes o todos según el estado
  const registrosMostrados = mostrarTodos ? registrosOrdenados : registrosOrdenados.slice(0, 5);

  const eliminarRegistro = async (id) => {
    setModalConfirm({ isOpen: true, id });
  };

  const editarRegistro = (registro) => {
    if (onEditarRegistro) {
      onEditarRegistro(registro);
    }
  };

  const confirmarEliminar = async () => {
    try {
      const response = await fetch(`/api/registros?id=${modalConfirm.id}&empleado=${empleado}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onRegistroEliminado();
        setModalConfirm({ isOpen: false, id: null });
      }
    } catch (error) {
      console.error('Error al eliminar registro:', error);
    }
  };

  return (
    <>
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
          Registros {mostrarTodos ? `(${registros.length})` : `(${Math.min(5, registros.length)} de ${registros.length})`}
        </h2>
        {registros.length > 5 && (
          <button
            onClick={() => setMostrarTodos(!mostrarTodos)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold inline-flex items-center gap-2"
          >
            {mostrarTodos ? '👁️ Ver Menos' : '📋 Ver Todos'}
          </button>
        )}
      </div>
      {registros.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No hay registros</p>
      ) : (
        <>
          {/* Vista móvil - Cards */}
          <div className="sm:hidden space-y-4">
            {registrosMostrados.map((registro) => (
              <div key={registro.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-900">
                    {formatearFechaConDia(registro.fechaIngreso)}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    registro.pagado 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {registro.pagado ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Ingreso: {formatearHora(registro.horaIngreso) || 'No registrado'}</div>
                  {registro.fechaEgreso ? (
                    <>
                      <div>Fecha Egreso: {formatearFechaConDia(registro.fechaEgreso)}</div>
                      <div>Hora Egreso: {formatearHora(registro.horaEgreso) || 'No registrado'}</div>
                    </>
                  ) : (
                    <div className="text-orange-600 font-medium">Egreso pendiente</div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => editarRegistro(registro)}
                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
                  >
                    <span className="mr-1">✏️</span>
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarRegistro(registro.id)}
                    className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors inline-flex items-center justify-center"
                  >
                    <span className="mr-1">🗑️</span>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700">Fecha Ingreso</th>
                  <th className="px-4 py-2 text-left text-gray-700">Hora Ingreso</th>
                  <th className="px-4 py-2 text-left text-gray-700">Fecha Egreso</th>
                  <th className="px-4 py-2 text-left text-gray-700">Hora Egreso</th>
                  <th className="px-4 py-2 text-center text-gray-700">Estado</th>
                  <th className="px-4 py-2 text-center text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registrosMostrados.map((registro) => (
                  <tr key={registro.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{formatearFechaConDia(registro.fechaIngreso)}</td>
                    <td className="px-4 py-2 text-gray-900">{formatearHora(registro.horaIngreso) || 'No registrado'}</td>
                    <td className="px-4 py-2 text-gray-900">
                      {registro.fechaEgreso ? formatearFechaConDia(registro.fechaEgreso) : (
                        <span className="text-orange-600 font-medium">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{formatearHora(registro.horaEgreso) || 'No registrado'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        registro.pagado 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {registro.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => editarRegistro(registro)}
                          className="bg-blue-600 text-white px-3 py-1 hover:bg-blue-700 transition-colors text-sm inline-flex items-center"
                        >
                          <span className="mr-1">✏️</span>
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarRegistro(registro.id)}
                          className="bg-red-600 text-white px-3 py-1 hover:bg-red-700 transition-colors text-sm inline-flex items-center"
                        >
                          <span className="mr-1">🗑️</span>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>

    <ModalConfirmacion
      isOpen={modalConfirm.isOpen}
      onClose={() => setModalConfirm({ isOpen: false, id: null })}
      onConfirm={confirmarEliminar}
      title="Confirmar eliminación"
      message="¿Está seguro de eliminar este registro?"
    />
  </>
  );
}