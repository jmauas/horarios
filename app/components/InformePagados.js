'use client';

import { useState } from 'react';
import { formatearFecha, formatearHora, formatearFechaConDia, formatearMoneda, calcularHorasMinutos, formatearFechaHoraCompleta } from '../utils/formateo';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InformePagados({ registros, empleado, pagosRealizados = [] }) {
  const [mostrarInforme, setMostrarInforme] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);

  const handleClickPago = (pago) => {
    setFechaDesde(pago.fechaDesde);
    setFechaHasta(pago.fechaHasta);
    setPagoSeleccionado(pago.id);
    setMostrarInforme(true);
  };

  const generarInformePagados = () => {
    if (!fechaDesde || !fechaHasta) return [];

    const registrosPagados = registros.filter(r => {
      if (!r.pagado || !r.fechaPago) return false;
      return r.fechaPago >= fechaDesde && r.fechaPago <= fechaHasta;
    });

    return registrosPagados.map(registro => {
      const { horas, minutos, totalHoras } = calcularHorasMinutos(
        registro.fechaIngreso,
        registro.horaIngreso,
        registro.fechaEgreso,
        registro.horaEgreso
      );

      return {
        ...registro,
        horas,
        minutos,
        totalHoras,
        totalHorasPago: totalHoras * (registro.valorHoraPago || 0),
        totalViaticoPago: registro.valorViaticoPago || 0,
        totalAdicionalPago: registro.valorAdicionalPago || 0,
        total: (totalHoras * (registro.valorHoraPago || 0)) + (registro.valorViaticoPago || 0) + (registro.valorAdicionalPago || 0)
      };
    });
  };

  const generarPDF = () => {
    const informe = generarInformePagados();
    if (informe.length === 0) {
      alert('No hay registros pagados en el rango de fechas seleccionado');
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Informe de Días Pagados', 14, 20);
    
    // Nombre del empleado
    doc.setFontSize(12);
    const nombreCapitalizado = empleado.charAt(0).toUpperCase() + empleado.slice(1).replace(/-/g, ' ');
    doc.text(`Empleado: ${nombreCapitalizado}`, 14, 28);
    
    // Rango de fechas
    doc.setFontSize(11);
    doc.text(`Período: ${formatearFecha(fechaDesde)} - ${formatearFecha(fechaHasta)}`, 14, 35);
    
    // Datos de la tabla
    const tableData = informe.map(item => [
      formatearFechaConDia(item.fechaIngreso),
      `${item.horaIngreso} - ${item.horaEgreso}`,
      `${item.horas}h ${item.minutos}m`,
      formatearMoneda(item.valorHoraPago),
      formatearMoneda(item.valorViaticoPago),
      formatearMoneda(item.totalAdicionalPago),
      formatearMoneda(item.total),
      formatearFechaHoraCompleta(item.fechaPago, item.horaPago)
    ]);

    // Generar tabla
    autoTable(doc, {
      startY: 42,
      head: [['Fecha', 'Horario', 'Horas', 'Valor/Hora', 'Viático', 'Adicional', 'Total Día', 'Fecha Pago']],
      body: tableData,
      foot: [[
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        formatearMoneda(informe.reduce((sum, item) => sum + item.total, 0)),
        ''
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
      footStyles: { fillColor: [200, 200, 200], fontStyle: 'bold' }
    });

    // Guardar PDF
    doc.save(`informe-pagados-${empleado}-${fechaDesde}-${fechaHasta}.pdf`);
  };

  const informe = generarInformePagados();
  const totalGeneral = informe.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">📑 Informe de Días Pagados</h2>
        <button
          onClick={() => setMostrarInforme(!mostrarInforme)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
        >
          <span className="mr-2">{mostrarInforme ? '👁️' : '📋'}</span>
          {mostrarInforme ? 'Ocultar' : 'Ver Informe'}
        </button>
      </div>

      {mostrarInforme && (
        <>
          {/* Cards de Pagos Realizados */}
          {pagosRealizados.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">💰 Pagos Realizados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagosRealizados.slice().reverse().map((pago) => (
                  <div
                    key={pago.id}
                    onClick={() => handleClickPago(pago)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                      pagoSeleccionado === pago.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-semibold text-gray-800">
                        {formatearFechaConDia(pago.fechaPago)}
                      </div>
                      <div className="text-xs text-gray-600">{pago.horaPago}</div>
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {formatearMoneda(pago.importeTotal)}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>📅 {formatearFecha(pago.fechaDesde)} - {formatearFecha(pago.fechaHasta)}</div>
                      <div>📊 {pago.cantidadDias} día{pago.cantidadDias !== 1 ? 's' : ''}</div>
                      <div>💵 Hora: {formatearMoneda(pago.valorHora)} | Viático: {formatearMoneda(pago.valorViatico)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generarPDF}
                disabled={!fechaDesde || !fechaHasta || informe.length === 0}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span className="mr-2">📄</span>
                Generar PDF
              </button>
            </div>
          </div>

          {informe.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              {fechaDesde && fechaHasta 
                ? 'No hay registros pagados en el rango de fechas seleccionado' 
                : 'Seleccione un rango de fechas para ver el informe'}
            </p>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="sm:hidden space-y-4">
                {informe.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="font-semibold text-gray-900 mb-2">{formatearFechaConDia(item.fechaIngreso)}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Horario: {item.horaIngreso} - {item.horaEgreso}</div>
                      <div>Horas: {item.horas}h {item.minutos}m</div>
                      <div>Valor/Hora: {formatearMoneda(item.valorHoraPago)}</div>
                      <div>Viático: {formatearMoneda(item.valorViaticoPago)}</div>
                      {item.totalAdicionalPago > 0 && (
                        <div>Adicional: {formatearMoneda(item.totalAdicionalPago)}</div>
                      )}
                      <div className="font-semibold text-green-700">Total: {formatearMoneda(item.total)}</div>
                      <div className="text-xs text-gray-500 mt-2">Pagado: {formatearFechaHoraCompleta(item.fechaPago, item.horaPago)}</div>
                    </div>
                  </div>
                ))}
                <div className="bg-indigo-100 rounded-lg p-4 mt-4">
                  <div className="font-bold text-gray-900 text-lg">
                    Total General: {formatearMoneda(totalGeneral)}
                  </div>
                </div>
              </div>

              {/* Vista desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-700">Fecha</th>
                      <th className="px-4 py-2 text-left text-gray-700">Horario</th>
                      <th className="px-4 py-2 text-right text-gray-700">Horas</th>
                      <th className="px-4 py-2 text-right text-gray-700">Valor/Hora</th>
                      <th className="px-4 py-2 text-right text-gray-700">Viático</th>
                      <th className="px-4 py-2 text-right text-gray-700">Adicional</th>
                      <th className="px-4 py-2 text-right text-gray-700">Total Día</th>
                      <th className="px-4 py-2 text-left text-gray-700">Fecha Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">{formatearFechaConDia(item.fechaIngreso)}</td>
                        <td className="px-4 py-2 text-gray-900">{item.horaIngreso} - {item.horaEgreso}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{item.horas}h {item.minutos}m</td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatearMoneda(item.valorHoraPago)}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatearMoneda(item.valorViaticoPago)}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatearMoneda(item.totalAdicionalPago)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatearMoneda(item.total)}</td>
                        <td className="px-4 py-2 text-gray-900 text-sm">{formatearFechaHoraCompleta(item.fechaPago, item.horaPago)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-100 font-bold">
                    <tr>
                      <td colSpan="6" className="px-4 py-3 text-gray-900">TOTAL GENERAL</td>
                      <td className="px-4 py-3 text-right text-lg text-indigo-700">{formatearMoneda(totalGeneral)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}