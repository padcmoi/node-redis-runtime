import { createPocApp } from "./app.js";
import { POC_PORT } from "./config/env.js";
import { assertRedisConnections } from "./services/redis.service.js";

async function bootstrap() {
  await assertRedisConnections();

  const app = createPocApp();
  app.listen(POC_PORT, () => {
    console.info(`[POC] node-redis-runtime listening on :${POC_PORT}`);
  });
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[POC] startup error: ${message}`);
  process.exitCode = 1;
});
