'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [nombreEmpleado, setNombreEmpleado] = useState('');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nombreEmpleado.trim()) {
      // Convertir a minúsculas y eliminar espacios para la URL
      const nombreUrl = nombreEmpleado.trim().toLowerCase().replace(/\s+/g, '-');
      router.push(`/${nombreUrl}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            Sistema de Horarios
          </h1>
          <p className="text-gray-600">
            Ingrese el nombre del empleado para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="nombre" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre del Empleado
            </label>
            <input
              type="text"
              id="nombre"
              value={nombreEmpleado}
              onChange={(e) => setNombreEmpleado(e.target.value)}
              placeholder="Ej: José, María, etc."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg flex items-center justify-center gap-2"
          >
            <span>▶️</span>
            Continuar
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>💡 Tip: Cada empleado tiene su propio registro independiente</p>
        </div>
      </div>
    </div>
  );
}

