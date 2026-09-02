import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../utils/env.js";
import * as schema from "./schema.js";

const sql = neon(env.NEON_DATABASE_URL);
export const db = drizzle(sql, { schema });
