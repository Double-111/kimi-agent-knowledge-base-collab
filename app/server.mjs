import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const qagentRoot = path.resolve(projectRoot, "../QAgent-master");
const qagentBin = path.join(qagentRoot, "bin", "qagent.js");
const dataRoot = path.join(__dirname, "public", "data");

const PORT = Number(process.env.PORT || 8787);

let cache = null;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(text);
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function loadDataset() {
  if (cache) {
    return cache;
  }

  const [
    knowledgeGraph,
    philosophicalOntology,
    formalOntology,
    scientificOntology,
  ] = await Promise.all([
    readJson(path.join(dataRoot, "knowledge-graph", "unified-knowledge-graph.json")),
    readJson(path.join(dataRoot, "core-ontology", "philosophical-ontology.json")),
    readJson(path.join(dataRoot, "core-ontology", "formal-ontology.json")),
    readJson(path.join(dataRoot, "domain-ontology", "scientific-ontology.json")),
  ]);

  cache = {
    knowledgeGraph,
    philosophicalOntology,
    formalOntology,
    scientificOntology,
  };

  return cache;
}

function searchEntities(knowledgeGraph, query) {
  const lowerQuery = query.trim().toLowerCase();
  if (!lowerQuery) {
    return [];
  }

  return Object.values(knowledgeGraph.entity_index).filter((entity) =>
    entity.name.toLowerCase().includes(lowerQuery)
    || entity.definition.toLowerCase().includes(lowerQuery)
    || entity.domain.toLowerCase().includes(lowerQuery)
    || entity.type.toLowerCase().includes(lowerQuery)
  );
}

function getRelatedEntities(knowledgeGraph, entityId) {
  const related = knowledgeGraph.cross_references.filter((ref) =>
    ref.source === entityId || ref.target === entityId
  );

  return related
    .map((ref) => {
      const relatedId = ref.source === entityId ? ref.target : ref.source;
      return knowledgeGraph.entity_index[relatedId];
    })
    .filter(Boolean);
}

function collectContext(knowledgeGraph, entityId, question) {
  const entity = entityId ? knowledgeGraph.entity_index[entityId] : null;
  const related = entity ? getRelatedEntities(knowledgeGraph, entityId).slice(0, 6) : [];
  const searchHits = searchEntities(knowledgeGraph, question).slice(0, 8);

  return {
    entity,
    related,
    searchHits,
  };
}

function buildPrompt(question, context) {
  const sections = [
    "你是一个本体论知识库助手。请基于提供的知识库上下文回答，尽量准确、清晰，优先使用上下文中的概念与关系。",
    "如果上下文不足，请明确说明“当前知识库中没有足够依据”，然后再给出谨慎推断。",
  ];

  if (context.entity) {
    sections.push(
      `当前用户正在查看实体：\n${JSON.stringify(context.entity, null, 2)}`
    );
  }

  if (context.related.length > 0) {
    sections.push(
      `相关实体：\n${JSON.stringify(context.related, null, 2)}`
    );
  }

  if (context.searchHits.length > 0) {
    sections.push(
      `与问题相关的知识库匹配项：\n${JSON.stringify(context.searchHits, null, 2)}`
    );
  }

  sections.push(`用户问题：${question}`);
  return sections.join("\n\n");
}

function extractAssistantText(result) {
  const uiMessages = result?.payload?.uiMessages;
  if (Array.isArray(uiMessages)) {
    const assistant = [...uiMessages].reverse().find((message) => message.role === "assistant");
    if (assistant?.content) {
      return assistant.content;
    }
  }

  const commandMessages = result?.messages;
  if (Array.isArray(commandMessages) && commandMessages.length > 0) {
    return commandMessages.map((message) => message.text).join("\n");
  }

  return "";
}

function extractRuntimeError(result) {
  const uiMessages = result?.payload?.uiMessages;
  if (Array.isArray(uiMessages)) {
    const lastError = [...uiMessages].reverse().find((message) => message.role === "error");
    if (lastError?.content) {
      return lastError.content;
    }
  }

  const commandMessages = result?.messages;
  if (Array.isArray(commandMessages)) {
    const errorMessage = commandMessages.find((message) => message.level === "error");
    if (errorMessage?.text) {
      return errorMessage.text;
    }
  }

  return "QAgent 运行失败";
}

async function runQAgent(prompt) {
  if (!existsSync(qagentBin)) {
    throw new Error(`QAgent not found at ${qagentBin}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [qagentBin, "--json", "--cwd", projectRoot, "run", prompt],
      {
        cwd: qagentRoot,
        env: {
          ...process.env,
          QAGENT_APPROVAL_MODE: process.env.QAGENT_APPROVAL_MODE || "never",
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && stdout.trim().length === 0) {
        reject(new Error(stderr.trim() || `QAgent exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve({
          raw: parsed,
          answer: extractAssistantText(parsed),
          stderr: stderr.trim(),
        });
      } catch (error) {
        reject(
          new Error(
            `Failed to parse QAgent response: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  });
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getStaticFilePath(urlPathname) {
  const relativePath = urlPathname === "/" ? "dist/index.html" : `dist${urlPathname}`;
  return path.join(__dirname, relativePath);
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      sendJson(res, 400, { error: "Missing request URL" });
      return;
    }

    if (req.method === "OPTIONS") {
      sendText(res, 204, "");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const dataset = await loadDataset();

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        qagentAvailable: existsSync(qagentBin),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/knowledge-graph") {
      sendJson(res, 200, dataset.knowledgeGraph);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ontologies") {
      sendJson(res, 200, {
        philosophicalOntology: dataset.philosophicalOntology,
        formalOntology: dataset.formalOntology,
        scientificOntology: dataset.scientificOntology,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/entities") {
      sendJson(res, 200, Object.values(dataset.knowledgeGraph.entity_index));
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/entities/")) {
      const entityId = decodeURIComponent(url.pathname.replace("/api/entities/", ""));
      const entity = dataset.knowledgeGraph.entity_index[entityId];

      if (!entity) {
        sendJson(res, 404, { error: `Entity not found: ${entityId}` });
        return;
      }

      sendJson(res, 200, {
        entity,
        relatedEntities: getRelatedEntities(dataset.knowledgeGraph, entityId),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/search") {
      const query = url.searchParams.get("q") || "";
      sendJson(res, 200, searchEntities(dataset.knowledgeGraph, query));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await parseBody(req);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const entityId = typeof body.entityId === "string" ? body.entityId : undefined;

      if (!question) {
        sendJson(res, 400, { error: "question is required" });
        return;
      }

      const context = collectContext(dataset.knowledgeGraph, entityId, question);
      const prompt = buildPrompt(question, context);
      const result = await runQAgent(prompt);

      if (result.raw?.status !== "success") {
        sendJson(res, 502, {
          error: extractRuntimeError(result.raw),
          context,
          raw: result.raw,
          stderr: result.stderr,
        });
        return;
      }

      sendJson(res, 200, {
        answer: result.answer,
        context,
        raw: result.raw,
        stderr: result.stderr,
      });
      return;
    }

    const staticFilePath = getStaticFilePath(url.pathname);
    if (existsSync(staticFilePath)) {
      const content = await readFile(staticFilePath);
      sendText(res, 200, content, getContentType(staticFilePath));
      return;
    }

    if (existsSync(path.join(__dirname, "dist", "index.html"))) {
      const fallback = await readFile(path.join(__dirname, "dist", "index.html"), "utf8");
      sendText(res, 200, fallback, "text/html; charset=utf-8");
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Ontology API server listening on http://localhost:${PORT}`);
});
