import pg from 'pg';

const { Pool } = pg;

// Use a single pool instance
// We use global to preserve the pool across hot reloads in development
let pool;

// Force SSL settings for Supabase
// We need to remove sslmode=require from the connection string to allow
// our explicit ssl config (rejectUnauthorized: false) to take precedence
// and avoid SELF_SIGNED_CERT_IN_CHAIN errors.
let connectionString = process.env.POSTGRES_URL;
if (connectionString && connectionString.includes('sslmode=require')) {
  connectionString = connectionString.replace('sslmode=require', '');
}

const isProduction = process.env.NODE_ENV === 'production';

if (!global.pgPool) {
  console.log('Initializing new Postgres Pool...');
  global.pgPool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Always allow self-signed certs for Supabase
    }
  });
}
pool = global.pgPool;

// Helper to mimic the tagged template literal behavior of @vercel/postgres
async function sql(strings, ...values) {
  const text = strings.reduce((acc, str, i) => {
    const valuePlaceholder = i < values.length ? `$${i + 1}` : '';
    return acc + str + valuePlaceholder;
  }, '');

  return await pool.query(text, values);
}

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
