import { loadEnv, type Env } from "./config/env.js";
import { GeminiProvider } from "./llm/geminiProvider.js";
import { LlmService } from "./llm/llmService.js";
import { createApp } from "./app.js";
import { createPrismaClient } from "./lib/prisma.js";
import { createProjectRepository } from "./projects/project.repository.js";

let env: Env;
try {
  env = loadEnv();
} catch (err) {
  console.error(`[config] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1); // AC1.2
}

const llm = new LlmService(
  new GeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.LLM_MODEL }),
);
const prisma = createPrismaClient(env.DATABASE_URL);
const app = createApp({
  llm,
  projectRepository: createProjectRepository(prisma),
});

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});
