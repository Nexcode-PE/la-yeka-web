import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error('DATABASE_URL must be configured before using the database.');

const globalForPrisma = globalThis as unknown as { laYekaPrisma?: PrismaClient };

export const db =
  globalForPrisma.laYekaPrisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.laYekaPrisma = db;
