import { loadEnv, type Env } from "./config/env.js";
import { GeminiProvider } from "./llm/geminiProvider.js";
import { LlmService } from "./llm/llmService.js";
import { createAccountRepository } from "./account/account.repository.js";
import { createAccountModule } from "./account/account.routes.js";
import { createKeyCipher } from "./account/keyCipher.js";
import { createApp } from "./app.js";
import { createAuthRepository } from "./auth/auth.repository.js";
import { createAuthModule } from "./auth/auth.routes.js";
import { createAuthService } from "./auth/auth.service.js";
import { createPrismaClient } from "./lib/prisma.js";
import { createPersonaRepository } from "./personas/persona.repository.js";
import { createProjectRepository } from "./projects/project.repository.js";
import { createRequirementRepository } from "./requirements/requirement.repository.js";

let env: Env;
try {
  env = loadEnv();
} catch (err) {
  console.error(`[config] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1); // AC1.2
}

const provider = new GeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.LLM_MODEL });
const llm = new LlmService(provider);
const prisma = createPrismaClient(env.DATABASE_URL);
const auth = createAuthModule(
  createAuthService({
    repository: createAuthRepository(prisma),
    legacyOwnerEmail: env.LEGACY_OWNER_EMAIL,
  }),
  { cookieSecure: env.COOKIE_SECURE ?? process.env["NODE_ENV"] === "production" },
);
const account = createAccountModule({
  repository: createAccountRepository(prisma),
  cipher: createKeyCipher(env.KEY_ENCRYPTION_SECRET),
  keyChecker: provider,
});
const app = createApp({
  auth,
  account,
  corsOrigin: env.CORS_ORIGIN,
  llm,
  projectRepository: createProjectRepository(prisma),
  personaRepository: createPersonaRepository(prisma),
  requirementRepository: createRequirementRepository(prisma),
});

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});
