// Utilidades para formateo de fechas y horas

export function formatearFecha(fecha) {
  if (!fecha) return '';
  
  // Si viene en formato YYYY-MM-DD
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

export function formatearHora(hora) {
  if (!hora) return '';
  
  // La hora ya viene en formato HH:MM
  return hora;
}

export function formatearFechaHora(fecha, hora) {
  if (!fecha || !hora) return '';
  
  return `${formatearFecha(fecha)} ${formatearHora(hora)}`;
}

// Convertir de DD/MM/YYYY a YYYY-MM-DD para inputs
export function fechaAInput(fechaFormateada) {
  if (!fechaFormateada) return '';
  
  const [day, month, year] = fechaFormateada.split('/');
  return `${year}-${month}-${day}`;
}

// Obtener día de la semana en 3 caracteres
export function obtenerDiaSemana(fecha) {
  if (!fecha) return '';
  
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const [year, month, day] = fecha.split('-');
  const fechaObj = new Date(year, month - 1, day);
  
  return diasSemana[fechaObj.getDay()];
}

// Formatear fecha con día de la semana
export function formatearFechaConDia(fecha) {
  if (!fecha) return '';
  
  const dia = obtenerDiaSemana(fecha);
  const fechaFormateada = formatearFecha(fecha);
  
  return `${dia} ${fechaFormateada}`;
}

// Formatear moneda sin decimales y con separador de miles
export function formatearMoneda(valor) {
  if (valor === null || valor === undefined) return '$ 0';
  
  const numero = Math.round(parseFloat(valor));
  return '$ ' + numero.toLocaleString('es-AR');
}

// Formatear fecha y hora completa para timestamp
export function formatearFechaHoraCompleta(fecha, hora) {
  if (!fecha || !hora) return '';
  
  return `${formatearFecha(fecha)} ${hora}`;
}

// Calcular horas y minutos entre dos fechas
export function calcularHorasMinutos(fechaIngreso, horaIngreso, fechaEgreso, horaEgreso) {
  const inicio = new Date(`${fechaIngreso}T${horaIngreso}`);
  const fin = new Date(`${fechaEgreso}T${horaEgreso}`);
  const diffMs = fin - inicio;
  
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { horas, minutos, totalHoras: diffMs / (1000 * 60 * 60) };
}
