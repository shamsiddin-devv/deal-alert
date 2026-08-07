import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";


export class DrizzleService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly db;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })
    this.db = drizzle(this.pool)
  };

  async onModuleDestroy() {
    await this.pool.end();
  };
};