import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { WikiMGKnowledgeBaseRepository } from "../repositories/wikiMGKnowledgeBaseRepository.mjs";
import { KnowledgeBaseService } from "../services/knowledgeBaseService.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../../../../Ontology_Factory");
const wikimgScriptPath = path.join(workspaceRoot, "WIKI_MG", "wikimg");

function createRepository() {
  return new WikiMGKnowledgeBaseRepository({
    workspaceRoot,
    profile: "kimi",
    wikimgScriptPath,
    pythonBin: process.env.PYTHON_BIN || "python3",
  });
}

test("WikiMG repository exports kimi-compatible knowledge graph", async () => {
  const repository = createRepository();

  const knowledgeGraph = await repository.getKnowledgeGraph();
  assert.ok(knowledgeGraph.statistics.total_entities >= 10);
  assert.ok(knowledgeGraph.statistics.total_relations >= 10);
  assert.deepEqual(knowledgeGraph.statistics.layers, ["common", "domain", "private"]);
  assert.ok(knowledgeGraph.statistics.layer_counts.private >= 1);
  assert.ok(knowledgeGraph.entity_index["domain:kimi-demo/智能养鱼系统概览"]);
  assert.ok(knowledgeGraph.entity_index["domain:kimi-demo/光照监测"]);
  assert.equal(knowledgeGraph.entity_index["domain:kimi-demo/光照监测"].layer, "domain");
  assert.ok(Array.isArray(knowledgeGraph.entity_index["common:kimi-demo/遥测字段规范"].formatted_sections));
  assert.ok(
    knowledgeGraph.entity_index["common:kimi-demo/遥测字段规范"].formatted_sections.some(
      (section) => section.title === "字段模板"
    )
  );

  const searchHits = await repository.searchEntities("光照");
  assert.ok(searchHits.some((item) => item.name === "光照监测"));

  const privateHits = await repository.searchEntities("private");
  assert.ok(privateHits.some((item) => item.layer === "private"));

  const related = await repository.getRelatedEntities("domain:kimi-demo/智能养鱼系统概览");
  assert.ok(related.length >= 3);

  const about = await repository.getAboutContent();
  assert.equal(about.platform.name, "WiKiMG 文件真源知识平台");

  const education = await repository.getEducationContent();
  assert.equal(education.featured_topic.title, "怎样把 Markdown 文档变成可检索的知识工作台？");
});

test("KnowledgeBaseService keeps existing response shapes on top of wikimg provider", async () => {
  const repository = createRepository();
  const service = new KnowledgeBaseService(repository);
  const previousProvider = process.env.KNOWLEDGE_BASE_PROVIDER;
  process.env.KNOWLEDGE_BASE_PROVIDER = "wikimg";

  try {
    const analysis = await service.getAnalysis("光照监测", "domain:kimi-demo/光照监测");
    assert.equal(analysis.entity_name, "光照监测");
    assert.ok(Array.isArray(analysis.ontology_breakdown.relations));
    assert.ok(analysis.ontology_breakdown.formalization.RDF.includes("光照监测"));

    const system = await service.getSystemAnalysis("自动投喂", "domain:kimi-demo/自动投喂");
    assert.equal(system.entity, "自动投喂");
    assert.ok(Array.isArray(system.hierarchy.subsystems));

    const workspace = await service.getEditorWorkspace("domain:kimi-demo/onenet接入");
    assert.equal(workspace.name, "Onenet 接入");
    assert.ok(Array.isArray(workspace.suggestions.suggested_relations));

    const context = await service.collectChatContext("请解释光照监测和系统之间的关系", "domain:kimi-demo/光照监测");
    assert.equal(context.entity?.name, "光照监测");
    assert.ok(Array.isArray(context.relatedDocuments));

    const about = await service.getAboutContent();
    assert.equal(about.metrics.provider, "wikimg");
    assert.ok(about.metrics.entities >= 10);
    assert.equal(about.metrics.layers, 3);
  } finally {
    if (previousProvider === undefined) {
      delete process.env.KNOWLEDGE_BASE_PROVIDER;
    } else {
      process.env.KNOWLEDGE_BASE_PROVIDER = previousProvider;
    }
  }
});
