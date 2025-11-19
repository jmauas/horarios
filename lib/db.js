import { sql } from '@vercel/postgres';

export async function initDb() {
  // Create tables if they don't exist
  // Note: In Postgres, we use SERIAL for auto-incrementing IDs
  // and BOOLEAN for true/false values
  
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
}

export default sql;
