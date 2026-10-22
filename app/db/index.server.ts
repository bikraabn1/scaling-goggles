import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __dbClient: postgres.Sql | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail.");
}

const client =
  global.__dbClient ||
  postgres(connectionString || "", {
    prepare: false, // Required for Supabase transaction pooler (port 6543)
  });

if (process.env.NODE_ENV !== "production") {
  global.__dbClient = client;
}

export const db = drizzle(client, { schema });
