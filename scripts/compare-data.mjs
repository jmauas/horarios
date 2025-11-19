import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const { Pool } = pg;
const dataDir = path.join(process.cwd(), 'data');

// Force SSL settings for Supabase (same logic as lib/db.js)
let connectionString = process.env.POSTGRES_URL;
if (connectionString && connectionString.includes('sslmode=require')) {
  connectionString = connectionString.replace('sslmode=require', '');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function compare() {
  console.log('Starting data comparison...');
  
  try {
    const client = await pool.connect();
    console.log('Connected to database.');

    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('registros') && f.endsWith('.json'));

    for (const file of files) {
      console.log(`\nAnalyzing ${file}...`);
      const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      
      let nombreEmpleado = content.empleado;
      if (!nombreEmpleado) {
        const match = file.match(/registros-(.+)\.json/);
        nombreEmpleado = match ? match[1] : 'default';
      }

      // Get Employee ID
      const { rows: empleados } = await client.query('SELECT id FROM empleados WHERE nombre = $1', [nombreEmpleado]);
      if (empleados.length === 0) {
        console.error(`❌ Employee '${nombreEmpleado}' not found in DB!`);
        continue;
      }
      const empleadoId = empleados[0].id;
      console.log(`✅ Employee '${nombreEmpleado}' found (ID: ${empleadoId})`);

      // Compare Configuration
      if (content.configuracion) {
        const { rows: configs } = await client.query('SELECT * FROM configuracion WHERE empleado_id = $1', [empleadoId]);
        if (configs.length === 0) {
             console.error(`  ❌ Missing configuration for employee ${nombreEmpleado}`);
        } else {
            const config = configs[0];
            if (Number(content.configuracion.valorHora) !== Number(config.valorhora)) {
                console.error(`  ⚠️  Config valorHora mismatch. JSON: ${content.configuracion.valorHora}, DB: ${config.valorhora}`);
            }
            if (Number(content.configuracion.valorViatico) !== Number(config.valorviatico)) {
                console.error(`  ⚠️  Config valorViatico mismatch. JSON: ${content.configuracion.valorViatico}, DB: ${config.valorviatico}`);
            }
            console.log('  ✅ Configuration verified.');
        }
      }

      // Compare Registros
      if (content.registros) {
        console.log(`  Checking ${content.registros.length} registros from JSON...`);
        const { rows: dbRegistros } = await client.query('SELECT * FROM registros WHERE empleado_id = $1', [empleadoId]);
        const dbRegistrosMap = new Map(dbRegistros.map(r => [r.original_id, r]));
        
        let missingRegistros = 0;
        // Print details of the first record for debugging
        if (content.registros.length > 0) {
            const firstReg = content.registros[0];
            const dbFirstReg = dbRegistrosMap.get(firstReg.id);
            console.log('  🔍 Debugging first record comparison:');
            console.log('  JSON:', JSON.stringify(firstReg, null, 2));
            console.log('  DB:', JSON.stringify(dbFirstReg, null, 2));
        }

        content.registros.forEach(reg => {
          const dbReg = dbRegistrosMap.get(reg.id);
          if (!dbReg) {
            console.error(`  ❌ Missing registro: ${reg.id} (${reg.fechaIngreso})`);
            missingRegistros++;
          } else {
             // Check values
             if (reg.pagado) {
                if (Number(reg.valorHoraPago) !== Number(dbReg.valorhorapago)) {
                    console.error(`  ⚠️  Registro ${reg.id}: valorHoraPago mismatch. JSON: ${reg.valorHoraPago}, DB: ${dbReg.valorhorapago}`);
                }
                if (Number(reg.valorViaticoPago) !== Number(dbReg.valorviaticopago)) {
                    console.error(`  ⚠️  Registro ${reg.id}: valorViaticoPago mismatch. JSON: ${reg.valorViaticoPago}, DB: ${dbReg.valorviaticopago}`);
                }
             }
          }
        });

        if (missingRegistros === 0) {
          console.log(`  ✅ All ${content.registros.length} registros found in DB.`);
        } else {
          console.log(`  ⚠️  ${missingRegistros} registros missing in DB.`);
        }
      }

      // Compare PagosRealizados
      if (content.pagosRealizados) {
        console.log(`  Checking ${content.pagosRealizados.length} pagosRealizados from JSON...`);
        const { rows: dbPagos } = await client.query('SELECT * FROM pagosRealizados WHERE empleado_id = $1', [empleadoId]);
        const dbPagosMap = new Map(dbPagos.map(p => [p.original_id, p]));
        
        if (content.pagosRealizados.length > 0) {
            const firstPago = content.pagosRealizados[0];
            const dbFirstPago = dbPagosMap.get(firstPago.id);
            console.log('  🔍 Debugging first payment comparison:');
            console.log('  JSON:', JSON.stringify(firstPago, null, 2));
            console.log('  DB:', JSON.stringify(dbFirstPago, null, 2));
        }

        let missingPagos = 0;
        for (const pago of content.pagosRealizados) {
          const dbPago = dbPagosMap.get(pago.id);
          if (!dbPago) {
            console.error(`  ❌ Missing pago: ${pago.id} (${pago.fechaPago})`);
            missingPagos++;
          } else {
            // Compare values
            const checkField = (field) => {
              // Convert to number for comparison if needed, handle string/number differences
              const jsonVal = Number(pago[field]);
              const dbVal = Number(dbPago[field.toLowerCase()]); // Postgres columns are lowercase
              
              // Allow small float differences
              if (Math.abs(jsonVal - dbVal) > 0.01) {
                console.error(`  ⚠️  Pago ${pago.id}: Field '${field}' mismatch. JSON: ${jsonVal}, DB: ${dbVal}`);
              }
            };

            checkField('importeTotal');
            checkField('valorHora');
            checkField('valorViatico');
            
            // Check links
            const { rows: links } = await client.query('SELECT * FROM pagos_registros WHERE pago_id = $1', [dbPago.id]);
            
            // Find expected links from JSON logic (registros that match this payment)
            // In the migration script, we linked based on:
            // empleado_id, pagado=true, fechaPago, horaPago
            const expectedLinks = content.registros.filter(r => 
              r.pagado && r.fechaPago === pago.fechaPago && r.horaPago === pago.horaPago
            );

            if (links.length !== expectedLinks.length) {
              console.error(`  ⚠️  Pago ${pago.id}: Expected ${expectedLinks.length} links, found ${links.length} in DB.`);
            } else {
               // console.log(`  ✅ Pago ${pago.id}: Links verified (${links.length})`);
            }
          }
        }

        if (missingPagos === 0) {
          console.log(`  ✅ All ${content.pagosRealizados.length} pagosRealizados found in DB.`);
        } else {
          console.log(`  ⚠️  ${missingPagos} pagosRealizados missing in DB.`);
        }
      }
    }

    client.release();
  } catch (error) {
    console.error('Comparison failed:', error);
  } finally {
    await pool.end();
  }
}

compare();