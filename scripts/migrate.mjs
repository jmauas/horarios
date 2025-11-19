import fs from 'fs';
import path from 'path';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const dataDir = path.join(process.cwd(), 'data');

async function migrate() {
  console.log('Starting migration to Vercel Postgres...');
  
  // Initialize DB (Create tables)
  // We need to import initDb from lib/db.js but that file uses ES modules and @vercel/postgres
  // which might be tricky in a standalone script if not transpiled.
  // For simplicity, we'll just run the CREATE TABLE statements here directly.
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS empleados (
        id SERIAL PRIMARY KEY,
        nombre TEXT UNIQUE NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS configuracion (
        id SERIAL PRIMARY KEY,
        empleado_id INTEGER NOT NULL,
        valorHora DECIMAL DEFAULT 0,
        valorViatico DECIMAL DEFAULT 0,
        valorAdicional DECIMAL DEFAULT 0,
        FOREIGN KEY(empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS registros (
        id SERIAL PRIMARY KEY,
        empleado_id INTEGER NOT NULL,
        fechaIngreso TEXT,
        horaIngreso TEXT,
        fechaEgreso TEXT,
        horaEgreso TEXT,
        temporal BOOLEAN DEFAULT FALSE,
        pagado BOOLEAN DEFAULT FALSE,
        fechaPago TEXT,
        horaPago TEXT,
        valorHoraPago DECIMAL,
        valorViaticoPago DECIMAL,
        valorAdicionalPago DECIMAL DEFAULT 0,
        original_id TEXT,
        FOREIGN KEY(empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS pagosRealizados (
        id SERIAL PRIMARY KEY,
        empleado_id INTEGER NOT NULL,
        fechaPago TEXT,
        horaPago TEXT,
        importeTotal DECIMAL,
        valorHora DECIMAL,
        valorViatico DECIMAL,
        valorAdicional DECIMAL DEFAULT 0,
        fechaDesde TEXT,
        fechaHasta TEXT,
        cantidadDias INTEGER,
        original_id TEXT,
        FOREIGN KEY(empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS pagos_registros (
        pago_id INTEGER NOT NULL,
        registro_id INTEGER NOT NULL,
        PRIMARY KEY (pago_id, registro_id),
        FOREIGN KEY(pago_id) REFERENCES pagosRealizados(id) ON DELETE CASCADE,
        FOREIGN KEY(registro_id) REFERENCES registros(id) ON DELETE CASCADE
      );
    `;
    
    console.log('Tables created/verified.');

    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('registros') && f.endsWith('.json'));

    for (const file of files) {
      console.log(`Processing ${file}...`);
      const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      
      // Determine employee name
      let nombreEmpleado = content.empleado;
      if (!nombreEmpleado) {
        const match = file.match(/registros-(.+)\.json/);
        if (match) {
          nombreEmpleado = match[1];
        } else {
          nombreEmpleado = 'default';
        }
      }

      // 1. Insert or Get Employee
      let { rows: empleados } = await sql`SELECT * FROM empleados WHERE nombre = ${nombreEmpleado}`;
      let empleado = empleados[0];
      
      if (!empleado) {
        const { rows: newEmpleados } = await sql`INSERT INTO empleados (nombre) VALUES (${nombreEmpleado}) RETURNING *`;
        empleado = newEmpleados[0];
        console.log(`Created employee: ${nombreEmpleado}`);
      } else {
        console.log(`Found employee: ${nombreEmpleado}`);
      }

      // 2. Insert Configuration
      if (content.configuracion) {
        const { rows: existingConfig } = await sql`SELECT * FROM configuracion WHERE empleado_id = ${empleado.id}`;
        if (existingConfig.length === 0) {
          await sql`
            INSERT INTO configuracion (empleado_id, valorHora, valorViatico, valorAdicional)
            VALUES (
              ${empleado.id},
              ${content.configuracion.valorHora || 0},
              ${content.configuracion.valorViatico || 0},
              0
            )
          `;
          console.log('Inserted configuration');
        }
      }

      // 3. Insert Registros
      const registroMap = new Map(); // Map original_id to new DB id

      if (content.registros) {
        for (const reg of content.registros) {
          // Check if already exists by original_id to avoid duplicates on re-run
          const { rows: existing } = await sql`SELECT id FROM registros WHERE original_id = ${reg.id}`;
          
          let registroId;
          if (existing.length > 0) {
             registroId = existing[0].id;
          } else {
            const { rows: inserted } = await sql`
              INSERT INTO registros (
                empleado_id, fechaIngreso, horaIngreso, fechaEgreso, horaEgreso,
                temporal, pagado, fechaPago, horaPago, valorHoraPago, valorViaticoPago,
                valorAdicionalPago, original_id
              ) VALUES (
                ${empleado.id},
                ${reg.fechaIngreso},
                ${reg.horaIngreso},
                ${reg.fechaEgreso},
                ${reg.horaEgreso},
                ${reg.temporal ? true : false},
                ${reg.pagado ? true : false},
                ${reg.fechaPago || null},
                ${reg.horaPago || null},
                ${reg.valorHoraPago || null},
                ${reg.valorViaticoPago || null},
                0,
                ${reg.id}
              ) RETURNING id
            `;
            registroId = inserted[0].id;
          }
          registroMap.set(reg.id, registroId);
        }
        console.log(`Processed ${content.registros.length} records`);
      }

      // 4. Insert PagosRealizados and Link
      if (content.pagosRealizados) {
        for (const pago of content.pagosRealizados) {
          const { rows: existingPago } = await sql`SELECT id FROM pagosRealizados WHERE original_id = ${pago.id}`;
          
          let pagoId;
          if (existingPago.length > 0) {
            pagoId = existingPago[0].id;
          } else {
            const { rows: insertedPago } = await sql`
              INSERT INTO pagosRealizados (
                empleado_id, fechaPago, horaPago, importeTotal, valorHora, valorViatico,
                valorAdicional, fechaDesde, fechaHasta, cantidadDias, original_id
              ) VALUES (
                ${empleado.id},
                ${pago.fechaPago},
                ${pago.horaPago},
                ${pago.importeTotal},
                ${pago.valorHora},
                ${pago.valorViatico},
                0,
                ${pago.fechaDesde},
                ${pago.fechaHasta},
                ${pago.cantidadDias},
                ${pago.id}
              ) RETURNING id
            `;
            pagoId = insertedPago[0].id;

            // Find matching records to link
            // Matching logic: same empleado, pagado=true, fechaPago and horaPago match
            const { rows: matchingRegistros } = await sql`
              SELECT id FROM registros 
              WHERE empleado_id = ${empleado.id} AND pagado = true AND fechaPago = ${pago.fechaPago} AND horaPago = ${pago.horaPago}
            `;

            for (const reg of matchingRegistros) {
              // Check if link exists
              const { rows: existingLink } = await sql`SELECT * FROM pagos_registros WHERE pago_id = ${pagoId} AND registro_id = ${reg.id}`;
              if (existingLink.length === 0) {
                await sql`INSERT INTO pagos_registros (pago_id, registro_id) VALUES (${pagoId}, ${reg.id})`;
              }
            }
            console.log(`Inserted payment ${pago.id} and linked ${matchingRegistros.length} records`);
          }
        }
      }
    }
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
