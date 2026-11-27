import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.drizzle';

export interface Sql {
  query<T>(statement: string, parameters?: unknown[]): Promise<T[]>;
}
export interface Database extends Sql {
  transaction<T>(operation: (client: Sql) => Promise<T>): Promise<T>;
}
export const DATABASE = Symbol('DATABASE');

@Injectable()
export class DrizzleService implements Database, OnModuleDestroy {
  private readonly pool: Pool;
  readonly orm;

  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 15,
      statement_timeout: 15000,
      connectionTimeoutMillis: 5000,
      options: '-c timezone=UTC',
    });
    this.orm = drizzle(this.pool, { schema });
  }

  async query<T>(statement: string, parameters: unknown[] = []) {
    const result = await this.pool.query(statement, parameters);
    return result.rows as T[];
  }

  async transaction<T>(operation: (client: Sql) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await operation({
        query: async <R>(statement: string, parameters: unknown[] = []) =>
          (await client.query(statement, parameters)).rows as R[],
      });
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
