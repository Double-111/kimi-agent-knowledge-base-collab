import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

import { JsonKnowledgeBaseRepository } from "./repositories/jsonKnowledgeBaseRepository.mjs";
import { DatabaseKnowledgeBaseRepository } from "./repositories/databaseKnowledgeBaseRepository.mjs";
import { WikiMGKnowledgeBaseRepository } from "./repositories/wikiMGKnowledgeBaseRepository.mjs";
import { KnowledgeBaseService } from "./services/knowledgeBaseService.mjs";
import { AssistantSessionStateService } from "./services/assistantSessionStateService.mjs";
import { QAgentService } from "./services/qagentService.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(appRoot, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const qagentRuntimeRoot = path.join(projectRoot, ".qagent-web-runtime");
const defaultWikiMGRoot = path.resolve(workspaceRoot, "Ontology_Factory");
const defaultWikiMGScriptPath = path.join(defaultWikiMGRoot, "WIKI_MG", "wikimg");

function resolveQAgentRoot() {
  const candidates = [
    process.env.QAGENT_ROOT,
    path.resolve(projectRoot, "../QAgent"),
    path.resolve(projectRoot, "../QAgent-master"),
  ].filter(Boolean);

  return (
    candidates.find((candidate) => existsSync(path.join(candidate, "package.json")))
    || candidates[0]
  );
}

function resolveQAgentCommand(qagentRoot) {
  if (process.env.QAGENT_BIN) {
    return [process.execPath, process.env.QAGENT_BIN];
  }

  const builtBin = path.join(qagentRoot, "bin", "qagent.js");
  const builtDist = path.join(qagentRoot, "dist", "cli", "index.js");
  if (existsSync(builtBin) && existsSync(builtDist)) {
    return [process.execPath, builtBin];
  }

  const tsxBin = path.join(
    qagentRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsx.cmd" : "tsx",
  );
  const sourceEntry = path.join(qagentRoot, "src", "cli", "index.ts");
  if (existsSync(tsxBin) && existsSync(sourceEntry)) {
    return [tsxBin, sourceEntry];
  }

  return [process.execPath, builtBin];
}

export function createAppServices() {
  const repositoryMode = process.env.KNOWLEDGE_BASE_PROVIDER || "json";
  const qagentRoot = resolveQAgentRoot();

  let repository;

  if (repositoryMode === "database") {
    repository = new DatabaseKnowledgeBaseRepository({
      databaseUrl: process.env.DATABASE_URL,
    });
  } else if (repositoryMode === "wikimg") {
    const wikimgRoot = process.env.WIKIMG_ROOT || defaultWikiMGRoot;
    repository = new WikiMGKnowledgeBaseRepository({
      workspaceRoot: wikimgRoot,
      profile: process.env.WIKIMG_PROFILE || "kimi",
      wikimgScriptPath: process.env.WIKIMG_BIN || defaultWikiMGScriptPath,
      pythonBin: process.env.PYTHON_BIN || "python3",
    });
  } else {
    repository = new JsonKnowledgeBaseRepository({
      dataRoot: path.join(appRoot, "public", "data"),
      dbFilePath: path.join(appRoot, "data", "knowledge-base-db.json"),
    });
  }

  return {
    knowledgeBaseService: new KnowledgeBaseService(repository),
    assistantSessionStateService: new AssistantSessionStateService({
      runtimeRoot: qagentRuntimeRoot,
    }),
    qagentService: new QAgentService({
      qagentCommand: resolveQAgentCommand(qagentRoot),
      qagentRoot,
      projectRoot,
      runtimeRoot: qagentRuntimeRoot,
    }),
    appRoot,
  };
}
