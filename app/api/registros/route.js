import { NextResponse } from 'next/server';
import sql from '../../../lib/db';

// GET - Obtener todos los registros
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const nombreEmpleado = searchParams.get('empleado');

  if (!nombreEmpleado) {
    return NextResponse.json({ error: 'Empleado requerido' }, { status: 400 });
  }

  // 1. Buscar o crear empleado
  let { rows: empleados } = await sql`SELECT * FROM empleados WHERE nombre = ${nombreEmpleado}`;
  let empleado = empleados[0];
  
  if (!empleado) {
    const { rows: newEmpleados } = await sql`INSERT INTO empleados (nombre) VALUES (${nombreEmpleado}) RETURNING *`;
    empleado = newEmpleados[0];
    
    // Crear configuración por defecto
    await sql`INSERT INTO configuracion (empleado_id) VALUES (${empleado.id})`;
  }

  // 2. Obtener configuración
  const { rows: configs } = await sql`SELECT * FROM configuracion WHERE empleado_id = ${empleado.id}`;
  const configuracion = configs[0];

  // 3. Obtener registros
  const { rows: registros } = await sql`SELECT * FROM registros WHERE empleado_id = ${empleado.id} ORDER BY fechaIngreso DESC, horaIngreso DESC`;
  
  registros.forEach(r => {
    // Postgres returns booleans correctly, no need to convert 0/1
    // But we might want to ensure id is string for frontend consistency
    r.id = r.id.toString(); 
  });

  // 4. Obtener pagos realizados
  const { rows: pagosRealizados } = await sql`SELECT * FROM pagosRealizados WHERE empleado_id = ${empleado.id} ORDER BY fechaPago DESC, horaPago DESC`;
  pagosRealizados.forEach(p => {
    p.id = p.id.toString();
  });

  return NextResponse.json({
    empleado: nombreEmpleado,
    registros,
    configuracion,
    pagosRealizados
  });
}

// POST - Agregar un nuevo registro
export async function POST(request) {
  const body = await request.json();
  const { empleado: nombreEmpleado, ...nuevoRegistro } = body;
  
  const { rows: empleados } = await sql`SELECT id FROM empleados WHERE nombre = ${nombreEmpleado}`;
  const empleado = empleados[0];
  
  if (!empleado) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }

  const { rows: inserted } = await sql`
    INSERT INTO registros (
      empleado_id, fechaIngreso, horaIngreso, fechaEgreso, horaEgreso,
      temporal, pagado, valorAdicionalPago
    ) VALUES (
      ${empleado.id}, 
      ${nuevoRegistro.fechaIngreso}, 
      ${nuevoRegistro.horaIngreso}, 
      ${nuevoRegistro.fechaEgreso || null}, 
      ${nuevoRegistro.horaEgreso || null}, 
      ${nuevoRegistro.temporal ? true : false}, 
      false, 
      0
    ) RETURNING id
  `;

  return NextResponse.json({ 
    success: true, 
    registro: { ...nuevoRegistro, id: inserted[0].id.toString(), pagado: false, empleado: nombreEmpleado } 
  });
}

// PUT - Actualizar configuración, marcar como pagado, completar egreso o actualizar registro
export async function PUT(request) {
  const body = await request.json();
  const { empleado: nombreEmpleado } = body;
  
  const { rows: empleados } = await sql`SELECT id FROM empleados WHERE nombre = ${nombreEmpleado}`;
  const empleado = empleados[0];
  
  if (!empleado) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }

  if (body.tipo === 'configuracion') {
    await sql`
      UPDATE configuracion 
      SET valorHora = ${parseFloat(body.valorHora) || 0}, 
          valorViatico = ${parseFloat(body.valorViatico) || 0}, 
          valorAdicional = ${parseFloat(body.valorAdicional) || 0}
      WHERE empleado_id = ${empleado.id}
    `;
    
  } else if (body.tipo === 'marcarPagado') {
    const ids = body.ids || [];
    const fechaPago = new Date().toISOString().split('T')[0];
    const horaPago = new Date().toTimeString().slice(0, 5);
    const { importeTotal, fechaDesde, fechaHasta, valorAdicional } = body;
    
    const { rows: configs } = await sql`SELECT * FROM configuracion WHERE empleado_id = ${empleado.id}`;
    const config = configs[0];

    // Transaction logic is different in @vercel/postgres (it doesn't have explicit transaction object like better-sqlite3)
    // But we can just execute queries sequentially for now or use BEGIN/COMMIT if needed.
    // For simplicity in this context, we'll execute sequentially.
    
    // 1. Crear pago realizado
    const { rows: pagos } = await sql`
      INSERT INTO pagosRealizados (
        empleado_id, fechaPago, horaPago, importeTotal, valorHora, valorViatico,
        valorAdicional, fechaDesde, fechaHasta, cantidadDias
      ) VALUES (
        ${empleado.id},
        ${fechaPago},
        ${horaPago},
        ${importeTotal},
        ${config.valorHora},
        ${config.valorViatico},
        ${valorAdicional || 0},
        ${fechaDesde},
        ${fechaHasta},
        ${ids.length}
      ) RETURNING id
    `;
    
    const pagoId = pagos[0].id;

    // 2. Actualizar registros y vincular
    for (const id of ids) {
      await sql`
        UPDATE registros 
        SET pagado = true, fechaPago = ${fechaPago}, horaPago = ${horaPago}, 
            valorHoraPago = ${config.valorHora}, valorViaticoPago = ${config.valorViatico}, 
            valorAdicionalPago = ${valorAdicional || 0}
        WHERE id = ${id}
      `;
      
      await sql`INSERT INTO pagos_registros (pago_id, registro_id) VALUES (${pagoId}, ${id})`;
    }

  } else if (body.tipo === 'completarEgreso') {
    const { rows: registros } = await sql`
      SELECT * FROM registros 
      WHERE empleado_id = ${empleado.id} AND temporal = true 
      ORDER BY id DESC LIMIT 1
    `;
    const ultimoRegistroTemporal = registros[0];
    
    if (ultimoRegistroTemporal) {
      await sql`
        UPDATE registros 
        SET fechaEgreso = ${body.fechaEgreso}, horaEgreso = ${body.horaEgreso}, temporal = false
        WHERE id = ${ultimoRegistroTemporal.id}
      `;
    }
  } else if (body.tipo === 'actualizarRegistro') {
    await sql`
      UPDATE registros 
      SET fechaIngreso = ${body.fechaIngreso}, horaIngreso = ${body.horaIngreso}, 
          fechaEgreso = ${body.fechaEgreso}, horaEgreso = ${body.horaEgreso}
      WHERE id = ${body.id}
    `;
  }
  
  return NextResponse.json({ success: true });
}

// DELETE - Eliminar un registro
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (id) {
    await sql`DELETE FROM registros WHERE id = ${id}`;
  }
  
  return NextResponse.json({ success: true });
}
