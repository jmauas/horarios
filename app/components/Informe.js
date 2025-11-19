'use client';

import { useState, useEffect } from 'react';
import { formatearFecha, formatearHora, formatearFechaConDia, formatearMoneda, calcularHorasMinutos } from '../utils/formateo';
import ModalNotificacion, { ModalConfirmacion } from './Modal';
import Configuracion from './Configuracion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Informe({ registros, configuracion, empleado, onRegistrosActualizados }) {
  const [mostrarInforme, setMostrarInforme] = useState(false);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [modalNotif, setModalNotif] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, count: 0 });
  
  // Nuevos estados
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [valorAdicional, setValorAdicional] = useState(0);

  // Inicializar estados cuando cambian los datos
  useEffect(() => {
    const registrosNoPagados = registros.filter(r => !r.pagado && r.fechaEgreso && r.horaEgreso);
    setSelectedIds(new Set(registrosNoPagados.map(r => r.id)));
    setValorAdicional(parseFloat(configuracion.valorAdicional) || 0);
  }, [registros, configuracion]);

  const calcularHoras = (fechaIngreso, horaIngreso, fechaEgreso, horaEgreso) => {
    const inicio = new Date(`${fechaIngreso}T${horaIngreso}`);
    const fin = new Date(`${fechaEgreso}T${horaEgreso}`);
    const diff = fin - inicio;
    return diff / (1000 * 60 * 60); // Convertir a horas
  };

  const generarInforme = () => {
    const registrosNoPagados = registros.filter(r => !r.pagado && r.fechaEgreso && r.horaEgreso);
    
    return registrosNoPagados.map(registro => {
      const { horas, minutos, totalHoras } = calcularHorasMinutos(
        registro.fechaIngreso,
        registro.horaIngreso,
        registro.fechaEgreso,
        registro.horaEgreso
      );
      
      const totalHorasPago = totalHoras * parseFloat(configuracion.valorHora || 0);
      const totalViaticoPago = parseFloat(configuracion.valorViatico || 0);

      return {
        ...registro,
        horas,
        minutos,
        totalHoras,
        horasDecimal: totalHoras.toFixed(2),
        totalHorasPago,
        totalViaticoPago,
        total: totalHorasPago + totalViaticoPago
      };
    });
  };

  const handleCheckboxChange = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const registrosNoPagados = registros.filter(r => !r.pagado && r.fechaEgreso && r.horaEgreso);
      setSelectedIds(new Set(registrosNoPagados.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const marcarPagados = async () => {
    if (selectedIds.size === 0) {
      setModalNotif({
        isOpen: true,
        title: 'Sin selección',
        message: 'Seleccione al menos un registro para pagar',
        type: 'info'
      });
      return;
    }

    setModalConfirm({ isOpen: true, count: selectedIds.size });
  };

  const confirmarMarcarPagados = async () => {
    const informe = generarInforme();
    const registrosSeleccionados = informe.filter(item => selectedIds.has(item.id));
    
    // Calcular datos del pago
    const importeRegistros = registrosSeleccionados.reduce((sum, item) => sum + item.total, 0);
    const importeTotal = importeRegistros + parseFloat(valorAdicional || 0);
    
    const fechas = registrosSeleccionados.map(item => item.fechaIngreso).sort();
    const fechaDesde = fechas[0];
    const fechaHasta = fechas[fechas.length - 1];

    try {
      const response = await fetch('/api/registros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado,
          tipo: 'marcarPagado',
          ids: Array.from(selectedIds),
          importeTotal,
          valorAdicional: parseFloat(valorAdicional || 0),
          fechaDesde,
          fechaHasta
        })
      });
      
      if (response.ok) {
        onRegistrosActualizados();
        setModalConfirm({ isOpen: false, count: 0 });
        setModalNotif({
          isOpen: true,
          title: 'Éxito',
          message: 'Registros marcados como pagados',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error al marcar como pagado:', error);
      setModalNotif({
        isOpen: true,
        title: 'Error',
        message: 'No se pudieron marcar los registros',
        type: 'error'
      });
    }
  };

  const generarPDF = () => {
    const informe = generarInforme();
    if (informe.length === 0) {
      setModalNotif({
        isOpen: true,
        title: 'Sin datos',
        message: 'No hay registros para generar el PDF',
        type: 'info'
      });
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Informe de Días Sin Pagar', 14, 20);
    
    // Nombre del empleado
    doc.setFontSize(12);
    const nombreCapitalizado = empleado.charAt(0).toUpperCase() + empleado.slice(1).replace(/-/g, ' ');
    doc.text(`Empleado: ${nombreCapitalizado}`, 14, 28);
    
    // Fecha de generación
    doc.setFontSize(11);
    const ahora = new Date();
    doc.text(`Generado: ${ahora.toLocaleDateString('es-AR')} ${ahora.toLocaleTimeString('es-AR')}`, 14, 35);
    
    // Datos de la tabla
    const tableData = informe.map(item => [
      formatearFechaConDia(item.fechaIngreso),
      `${item.horaIngreso} - ${item.horaEgreso}`,
      `${item.horas}h ${item.minutos}m`,
      formatearMoneda(configuracion.valorHora),
      formatearMoneda(item.totalHorasPago),
      formatearMoneda(item.totalViaticoPago),
      formatearMoneda(item.total)
    ]);

    // Calcular totales
    const totalPorHoras = informe.reduce((sum, item) => sum + item.totalHorasPago, 0);
    const totalPorViatico = informe.reduce((sum, item) => sum + item.totalViaticoPago, 0);
    const totalRegistros = informe.reduce((sum, item) => sum + item.total, 0);
    const valorAdicionalNum = parseFloat(valorAdicional || 0);
    const totalGeneral = totalRegistros + valorAdicionalNum;

    // Generar tabla
    autoTable(doc, {
      startY: 42,
      head: [['Fecha', 'Horario', 'Horas', 'Valor Hora', 'Total Horas', 'Viático', 'Total Día']],
      body: tableData,
      foot: [
        [
          'SUBTOTAL',
          '',
          `${informe.reduce((sum, item) => sum + item.horas, 0)}h ${informe.reduce((sum, item) => sum + item.minutos, 0)}m`,
          '',
          formatearMoneda(totalPorHoras),
          formatearMoneda(totalPorViatico),
          formatearMoneda(totalRegistros)
        ],
        [
          { content: 'IMPORTE ADICIONAL DEL PAGO', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: formatearMoneda(valorAdicionalNum), styles: { fontStyle: 'bold' } }
        ],
        [
          { content: 'TOTAL A PAGAR', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 255, 220] } },
          { content: formatearMoneda(totalGeneral), styles: { fontStyle: 'bold', fillColor: [220, 255, 220] } }
        ]
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
      footStyles: { fillColor: [200, 200, 200] }
    });

    // Guardar PDF
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`informe-sin-pagar-${empleado}-${fecha}.pdf`);

    setModalNotif({
      isOpen: true,
      title: 'PDF Generado',
      message: 'El informe PDF se ha descargado correctamente',
      type: 'success'
    });
  };

  const informe = generarInforme();
  
  // Calcular totales basados en selección
  const registrosSeleccionados = informe.filter(item => selectedIds.has(item.id));
  const totalHorasSeleccionadas = registrosSeleccionados.reduce((sum, item) => sum + parseFloat(item.horasDecimal), 0);
  const totalImporteSeleccionado = registrosSeleccionados.reduce((sum, item) => sum + item.total, 0);
  const totalGeneral = totalImporteSeleccionado + parseFloat(valorAdicional || 0);

  return (
    <>
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          onClick={() => setMostrarInforme(!mostrarInforme)}
          className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-semibold inline-flex items-center justify-center"
        >
          <span className="mr-2">{mostrarInforme ? '👁️' : '📊'}</span>
          {mostrarInforme ? 'Ocultar Informe' : 'Ver Informe'}
        </button>
        {mostrarInforme && (
          <button
            onClick={() => setMostrarConfiguracion(!mostrarConfiguracion)}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold inline-flex items-center justify-center"
          >
            <span className="mr-2">{mostrarConfiguracion ? '🔧' : '⚙️'}</span>
            {mostrarConfiguracion ? 'Ocultar Configuración' : 'Ver Configuración'}
          </button>
        )}
        {mostrarInforme && informe.length > 0 && (
          <>
            <button
              onClick={generarPDF}
              className="flex-1 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors font-semibold inline-flex items-center justify-center"
            >
              <span className="mr-2">📄</span>
              Generar PDF
            </button>
            <button
              onClick={marcarPagados}
              className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors font-semibold inline-flex items-center justify-center"
            >
              <span className="mr-2">💰</span>
              Pagar Seleccionados ({selectedIds.size})
            </button>
          </>
        )}
      </div>

      {/* Configuración */}
      {mostrarConfiguracion && (
        <Configuracion
          configuracion={configuracion}
          empleado={empleado}
          onConfiguracionActualizada={onRegistrosActualizados}
        />
      )}

      {/* Informe */}
      {mostrarInforme && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">Informe de Días Sin Pagar</h2>
          {informe.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No hay registros completos sin pagar</p>
          ) : (
            <>
              {/* Vista móvil - Cards */}
              <div className="sm:hidden space-y-3">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === informe.length && informe.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm font-semibold text-gray-700">Seleccionar Todos</span>
                </div>
                {informe.map((item) => (
                  <div key={item.id} className={`border rounded-lg p-3 ${selectedIds.has(item.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleCheckboxChange(item.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="font-semibold text-gray-900">{formatearFechaConDia(item.fechaIngreso)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 ml-7">
                      <div><span className="font-bold">Ingreso:</span> {formatearHora(item.horaIngreso)}</div>
                      <div><span className="font-bold">Egreso:</span> {formatearHora(item.horaEgreso)}</div>
                      <div><span className="font-bold">Horas:</span> {item.horas}h {item.minutos}m</div>
                      <div><span className="font-bold">Valor Hora:</span> {formatearMoneda(configuracion.valorHora)}</div>
                      <div><span className="font-bold">Total Horas:</span> {formatearMoneda(item.totalHorasPago)}</div>
                      <div><span className="font-bold">Viático:</span> {formatearMoneda(item.totalViaticoPago)}</div>
                      <div className="col-span-2 pt-2 border-t border-gray-300 text-center font-semibold text-green-700">
                        Total: {formatearMoneda(item.total)}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-100 rounded-lg p-4 mt-4">
                  <div className="font-bold text-gray-900 space-y-2">
                    <div>Total Horas Seleccionadas: {totalHorasSeleccionadas.toFixed(2)}h</div>
                    <div>Subtotal Registros: {formatearMoneda(totalImporteSeleccionado)}</div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                      <span>IMPORTE ADICIONAL DEL PAGO:</span>
                      <input
                        type="number"
                        value={valorAdicional}
                        onChange={(e) => setValorAdicional(e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="text-lg text-green-700 pt-2 border-t-2 border-gray-300 mt-2 flex justify-between">
                      <span>Total General:</span>
                      <span>{formatearMoneda(totalGeneral)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vista desktop - Tabla */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === informe.length && informe.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-gray-700">Fecha</th>
                      <th className="px-4 py-2 text-left text-gray-700">Ingreso</th>
                      <th className="px-4 py-2 text-left text-gray-700">Egreso</th>
                      <th className="px-4 py-2 text-right text-gray-700">Horas</th>
                      <th className="px-4 py-2 text-right text-gray-700">Valor Hora</th>
                      <th className="px-4 py-2 text-right text-gray-700">Total Horas</th>
                      <th className="px-4 py-2 text-right text-gray-700">Viático</th>
                      <th className="px-4 py-2 text-right text-gray-700">Total Día</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.map((item) => (
                      <tr key={item.id} className={`border-b hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleCheckboxChange(item.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-gray-900">{formatearFechaConDia(item.fechaIngreso)}</td>
                        <td className="px-4 py-2 text-gray-900">{formatearHora(item.horaIngreso)}</td>
                        <td className="px-4 py-2 text-gray-900">{formatearHora(item.horaEgreso)}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{item.horas}h {item.minutos}m</td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatearMoneda(configuracion.valorHora)}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatearMoneda(item.totalHorasPago)}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatearMoneda(item.totalViaticoPago)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatearMoneda(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-gray-900 text-right">TOTALES SELECCIONADOS</td>
                      <td className="px-4 py-3 text-right text-gray-900">{totalHorasSeleccionadas.toFixed(2)}h</td>
                      <td colSpan="2" className="px-4 py-3 text-right text-gray-900">Subtotal:</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatearMoneda(totalImporteSeleccionado)}</td>
                    </tr>
                    <tr>
                      <td colSpan="8" className="px-4 py-3 text-right text-gray-900">IMPORTE ADICIONAL DEL PAGO:</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={valorAdicional}
                          onChange={(e) => setValorAdicional(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="9" className="px-4 py-3 text-right text-lg text-green-700">TOTAL GENERAL:</td>
                      <td className="px-4 py-3 text-right text-lg text-green-700">{formatearMoneda(totalGeneral)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>

    <ModalConfirmacion
      isOpen={modalConfirm.isOpen}
      onClose={() => setModalConfirm({ isOpen: false, count: 0 })}
      onConfirm={confirmarMarcarPagados}
      title="Confirmar acción"
      message={`¿Marcar ${modalConfirm.count} días seleccionados como pagados por un total de ${formatearMoneda(totalGeneral)}?`}
    />

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