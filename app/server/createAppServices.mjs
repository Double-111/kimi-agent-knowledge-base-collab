import path from "node:path";
import { fileURLToPath } from "node:url";

import { JsonKnowledgeBaseRepository } from "./repositories/jsonKnowledgeBaseRepository.mjs";
import { DatabaseKnowledgeBaseRepository } from "./repositories/databaseKnowledgeBaseRepository.mjs";
import { KnowledgeBaseService } from "./services/knowledgeBaseService.mjs";
import { QAgentService } from "./services/qagentService.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(appRoot, "..");
const qagentRoot = path.resolve(projectRoot, "../QAgent-master");

export function createAppServices() {
  const repositoryMode = process.env.KNOWLEDGE_BASE_PROVIDER || "json";

  const repository = repositoryMode === "database"
    ? new DatabaseKnowledgeBaseRepository({
        databaseUrl: process.env.DATABASE_URL,
      })
    : new JsonKnowledgeBaseRepository({
        dataRoot: path.join(appRoot, "public", "data"),
        dbFilePath: path.join(appRoot, "data", "knowledge-base-db.json"),
      });

  return {
    knowledgeBaseService: new KnowledgeBaseService(repository),
    qagentService: new QAgentService({
      qagentBin: path.join(qagentRoot, "bin", "qagent.js"),
      qagentRoot,
      projectRoot,
    }),
    appRoot,
  };
}
