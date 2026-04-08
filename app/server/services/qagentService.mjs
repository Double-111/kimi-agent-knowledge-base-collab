import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

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

export class QAgentService {
  constructor(options) {
    this.qagentBin = options.qagentBin;
    this.qagentRoot = options.qagentRoot;
    this.projectRoot = options.projectRoot;
  }

  buildPrompt(question, context) {
    const sections = [
      "你是一个本体论知识库助手。请基于提供的知识库上下文回答，尽量准确、清晰，优先使用上下文中的概念与关系。",
      "如果上下文不足，请明确说明“当前知识库中没有足够依据”，然后再给出谨慎推断。",
    ];

    if (context.entity) {
      sections.push(`当前用户正在查看实体：\n${JSON.stringify(context.entity, null, 2)}`);
    }
    if (context.related.length > 0) {
      sections.push(`相关实体：\n${JSON.stringify(context.related, null, 2)}`);
    }
    if (context.searchHits.length > 0) {
      sections.push(`与问题相关的知识库匹配项：\n${JSON.stringify(context.searchHits, null, 2)}`);
    }

    sections.push(`用户问题：${question}`);
    return sections.join("\n\n");
  }

  async ask(question, context) {
    const prompt = this.buildPrompt(question, context);
    const result = await this.runQAgent(prompt);

    if (result.raw?.status !== "success") {
      return {
        ok: false,
        error: extractRuntimeError(result.raw),
        raw: result.raw,
        stderr: result.stderr,
      };
    }

    return {
      ok: true,
      answer: result.answer,
      raw: result.raw,
      stderr: result.stderr,
    };
  }

  async runQAgent(prompt) {
    if (!existsSync(this.qagentBin)) {
      throw new Error(`QAgent not found at ${this.qagentBin}`);
    }

    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [this.qagentBin, "--json", "--cwd", this.projectRoot, "run", prompt],
        {
          cwd: this.qagentRoot,
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
            new Error(`Failed to parse QAgent response: ${error instanceof Error ? error.message : String(error)}`)
          );
        }
      });
    });
  }
}
