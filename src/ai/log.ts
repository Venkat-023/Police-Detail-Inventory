import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function logAiFeature(feature: string, input: unknown, output: unknown, startedAt: number, userId?: string) {
  await prisma.aiFeatureLog.create({
    data: {
      feature,
      userId,
      input: input == null ? undefined : JSON.parse(JSON.stringify(input)),
      output: output == null ? undefined : JSON.parse(JSON.stringify(output)),
      durationMs: Date.now() - startedAt,
    },
  });
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
