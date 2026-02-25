import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = new Proxy({} as PrismaClient, {
    get(target, prop) {
        if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = new PrismaClient({
                log: process.env.LOG_LEVEL === "debug" ? ["query", "error", "warn"] : ["error"],
            });
        }
        const client = globalForPrisma.prisma as Record<string, any>;
        const val = client[prop as string];
        if (typeof val === 'function') {
            return val.bind(client);
        }
        return val;
    }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = globalForPrisma.prisma;

