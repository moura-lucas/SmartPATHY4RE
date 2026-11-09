import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

export function createPrismaClient(databaseUrl: string) {
  // Without TLS, MySQL 8.4 needs the RSA key to re-authenticate after it restarts.
  const url = new URL(databaseUrl);
  url.searchParams.set("allowPublicKeyRetrieval", "true");
  return new PrismaClient({ adapter: new PrismaMariaDb(url.toString()) });
}
