import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __drizzleClient?: ReturnType<typeof drizzle>;
};

export const db = globalForDb.__drizzleClient ?? createDb();

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(process.env.DATABASE_URL, {
    ssl: "require",
    max: 10,
  });

  const enableQueryLogging = process.env.DRIZZLE_LOGS === "true";

  const drizzleDb = drizzle(client, { schema, logger: enableQueryLogging });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__drizzleClient = drizzleDb;
  }

  return drizzleDb;
}

export type DrizzleDb = typeof db;
