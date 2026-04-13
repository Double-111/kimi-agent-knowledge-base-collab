import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { createAppServices } from "./server/createAppServices.mjs";

const PORT = Number(process.env.PORT || 8787);
const {
  knowledgeBaseService,
  assistantSessionStateService,
  qagentService,
  appRoot,
} = createAppServices();

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

function openSse(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.write(": connected\n\n");
}

function writeSse(res, event, payload) {
  if (res.writableEnded) {
    return;
  }

  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
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
  return path.join(appRoot, relativePath);
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function parseConversationHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (
      item && typeof item === "object"
        ? {
            question: typeof item.question === "string" ? item.question : "",
            answer: typeof item.answer === "string" ? item.answer : "",
          }
        : null
    ))
    .filter(Boolean);
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

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        qagentAvailable: true,
        provider: process.env.KNOWLEDGE_BASE_PROVIDER || "json",
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/knowledge-graph") {
      sendJson(res, 200, await knowledgeBaseService.getKnowledgeGraph());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ontologies") {
      sendJson(res, 200, await knowledgeBaseService.getOntologies());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/entities") {
      sendJson(res, 200, await knowledgeBaseService.listEntities());
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/entities/")) {
      const entityId = decodeURIComponent(url.pathname.replace("/api/entities/", ""));
      const detail = await knowledgeBaseService.getEntityDetail(entityId);

      if (!detail) {
        sendJson(res, 404, { error: `Entity not found: ${entityId}` });
        return;
      }

      sendJson(res, 200, detail);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/search") {
      const query = url.searchParams.get("q") || "";
      sendJson(res, 200, await knowledgeBaseService.searchEntities(query));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/analysis") {
      const query = url.searchParams.get("q") || "";
      if (!query.trim()) {
        sendJson(res, 400, { error: "q is required" });
        return;
      }

      sendJson(res, 200, await knowledgeBaseService.getAnalysis(query, url.searchParams.get("entityId") || undefined));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/system-analysis") {
      const query = url.searchParams.get("q") || "";
      if (!query.trim()) {
        sendJson(res, 400, { error: "q is required" });
        return;
      }

      sendJson(res, 200, await knowledgeBaseService.getSystemAnalysis(query, url.searchParams.get("entityId") || undefined));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/education") {
      sendJson(res, 200, await knowledgeBaseService.getEducationContent(url.searchParams.get("entityId") || undefined));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/about") {
      sendJson(res, 200, await knowledgeBaseService.getAboutContent());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/editor/workspace") {
      sendJson(res, 200, await knowledgeBaseService.getEditorWorkspace(url.searchParams.get("entityId") || undefined));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/editor/preview") {
      const body = await parseBody(req);
      sendJson(res, 200, await knowledgeBaseService.previewEditorDraft({
        entityId: typeof body.entityId === "string" ? body.entityId : undefined,
        name: typeof body.name === "string" ? body.name : "",
        type: typeof body.type === "string" ? body.type : "",
        domain: typeof body.domain === "string" ? body.domain : "",
        source: typeof body.source === "string" ? body.source : "",
        definition: typeof body.definition === "string" ? body.definition : "",
        propertiesText: typeof body.propertiesText === "string" ? body.propertiesText : "",
      }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await parseBody(req);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const entityId = typeof body.entityId === "string" ? body.entityId : undefined;
      const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
      const businessPrompt = typeof body.businessPrompt === "string" ? body.businessPrompt : undefined;
      const modelName = typeof body.modelName === "string" ? body.modelName : undefined;
      const conversationHistory = parseConversationHistory(body.conversationHistory);

      if (!question) {
        sendJson(res, 400, { error: "question is required" });
        return;
      }

      const context = await knowledgeBaseService.collectChatContext(question, entityId);
      const result = await qagentService.ask(question, context, {
        conversationId,
        businessPrompt,
        modelName,
        conversationHistory,
      });

      if (!result.ok) {
        sendJson(res, 502, {
          error: result.error,
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

    if (req.method === "GET" && url.pathname === "/api/chat/state") {
      sendJson(res, 200, await assistantSessionStateService.load());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat/state") {
      const body = await parseBody(req);
      sendJson(res, 200, await assistantSessionStateService.save(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat/stream") {
      const body = await parseBody(req);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const entityId = typeof body.entityId === "string" ? body.entityId : undefined;
      const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
      const businessPrompt = typeof body.businessPrompt === "string" ? body.businessPrompt : undefined;
      const modelName = typeof body.modelName === "string" ? body.modelName : undefined;
      const conversationHistory = parseConversationHistory(body.conversationHistory);

      if (!question) {
        sendJson(res, 400, { error: "question is required" });
        return;
      }

      const context = await knowledgeBaseService.collectChatContext(question, entityId);
      const abortController = new AbortController();
      let streamCompleted = false;

      res.on("close", () => {
        if (!streamCompleted) {
          abortController.abort();
        }
      });

      openSse(res);
      writeSse(res, "context", context);
      writeSse(res, "status", {
        message: "已整理知识库上下文，准备连接 Agent CLI...",
      });

      try {
        const result = await qagentService.askStream(
          question,
          context,
          {
            onStatus(message) {
              writeSse(res, "status", { message });
            },
            onAnswerDelta(delta) {
              writeSse(res, "answer_delta", { delta });
            },
            onToolStarted(toolRun) {
              writeSse(res, "tool_started", toolRun);
            },
            onToolOutput(toolOutput) {
              writeSse(res, "tool_output", toolOutput);
            },
            onToolFinished(toolRun) {
              writeSse(res, "tool_finished", toolRun);
            },
          },
          {
            conversationId,
            businessPrompt,
            modelName,
            conversationHistory,
            signal: abortController.signal,
          }
        );

        if (!result.ok) {
          writeSse(res, "error", {
            message: result.error,
            context,
            raw: result.raw,
            stderr: result.stderr,
          });
          res.end();
          return;
        }

        writeSse(res, "complete", {
          answer: result.answer,
          context,
          raw: result.raw,
          stderr: result.stderr,
        });
        streamCompleted = true;
        res.end();
      } catch (error) {
        if (!res.writableEnded) {
          writeSse(res, "error", {
            message: error instanceof Error ? error.message : "Unknown server error",
          });
          streamCompleted = true;
          res.end();
        }
      }
      return;
    }

    const staticFilePath = getStaticFilePath(url.pathname);
    if (existsSync(staticFilePath)) {
      const content = await readFile(staticFilePath);
      sendText(res, 200, content, getContentType(staticFilePath));
      return;
    }

    const fallbackPath = path.join(appRoot, "dist", "index.html");
    if (existsSync(fallbackPath)) {
      const fallback = await readFile(fallbackPath, "utf8");
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
