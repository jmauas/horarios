'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLoading } from '../context/LoadingContext';
import IngresoEgresoRapido from '../components/IngresoEgresoRapido';
import ListaRegistros from '../components/ListaRegistros';
import ModalFormulario from '../components/ModalFormulario';
import Informe from '../components/Informe';
import InformePagados from '../components/InformePagados';

export default function EmpleadoPage() {
  const params = useParams();
  const router = useRouter();
  const empleado = params.empleado;
  const { showLoader, hideLoader } = useLoading();
  
  const [registros, setRegistros] = useState([]);
  const [configuracion, setConfiguracion] = useState({ valorHora: 0, valorViatico: 0 });
  const [pagosRealizados, setPagosRealizados] = useState([]);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);

  useEffect(() => {
    if (empleado) {
      cargarDatos();
    }
  }, [empleado]);

  const cargarDatos = async () => {
    showLoader();
    try {
      const response = await fetch(`/api/registros?empleado=${empleado}`);
      const datos = await response.json();
      setRegistros(datos.registros || []);
      setConfiguracion(datos.configuracion || { valorHora: 0, valorViatico: 0 });
      setPagosRealizados(datos.pagosRealizados || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      hideLoader();
    }
  };

  const handleEditarRegistro = (registro) => {
    setRegistroEditar(registro);
    setMostrarModalFormulario(true);
  };

  const handleCerrarModal = () => {
    setMostrarModalFormulario(false);
    setRegistroEditar(null);
  };

  const handleAbrirNuevoRegistro = () => {
    setRegistroEditar(null);
    setMostrarModalFormulario(true);
  };

  const handleVolverInicio = () => {
    router.push('/');
  };

  // Capitalizar nombre para mostrar
  const nombreCapitalizado = empleado
    ? empleado.charAt(0).toUpperCase() + empleado.slice(1).replace(/-/g, ' ')
    : '';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header con nombre del empleado y botón volver */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">
            Horarios de {nombreCapitalizado}
          </h1>
          <button
            onClick={handleVolverInicio}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center justify-center text-xl sm:text-2xl shadow-lg"
            title="Cambiar Empleado"
          >
            🚪
          </button>
        </div>

        <IngresoEgresoRapido 
          empleado={empleado}
          onRegistroAgregado={cargarDatos}
        />

        {/* Botón para abrir modal de registro manual */}
        <div className="mb-6">
          <button
            onClick={handleAbrirNuevoRegistro}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg flex items-center justify-center gap-2"
          >
            📝 Registrar Horario Manual
          </button>
        </div>

        <ListaRegistros 
          registros={registros}
          empleado={empleado}
          onRegistroEliminado={cargarDatos}
          onEditarRegistro={handleEditarRegistro}
          onActualizar={cargarDatos}
        />

        <Informe 
          registros={registros}
          configuracion={configuracion}
          empleado={empleado}
          onRegistrosActualizados={cargarDatos}
        />

        <InformePagados 
          registros={registros}
          empleado={empleado}
          pagosRealizados={pagosRealizados}
        />
      </div>

      {/* Modal de Formulario */}
      <ModalFormulario
        isOpen={mostrarModalFormulario}
        onClose={handleCerrarModal}
        registroEditar={registroEditar}
        empleado={empleado}
        onRegistroAgregado={cargarDatos}
      />
    </div>
  );
}
