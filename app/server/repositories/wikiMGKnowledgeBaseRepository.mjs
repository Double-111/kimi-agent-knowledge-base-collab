import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function safeObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

export class WikiMGKnowledgeBaseRepository {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot;
    this.profile = options.profile || "kimi";
    this.wikimgScriptPath = options.wikimgScriptPath;
    this.pythonBin = options.pythonBin || "python3";
    this.cache = null;
  }

  async loadDataset() {
    if (this.cache) {
      return this.cache;
    }

    const payload = await this.runWikiMG(["export", "--profile", this.profile, "--json"]);
    this.cache = payload;
    return payload;
  }

  async runWikiMG(args) {
    const { stdout } = await execFileAsync(
      this.pythonBin,
      [this.wikimgScriptPath, "--root", this.workspaceRoot, ...args],
      {
        cwd: this.workspaceRoot,
        env: process.env,
        maxBuffer: 20 * 1024 * 1024,
      }
    );

    return JSON.parse(stdout);
  }

  async getKnowledgeGraph() {
    const dataset = await this.loadDataset();
    return dataset.knowledgeGraph;
  }

  async getOntologies() {
    const dataset = await this.loadDataset();
    const description = dataset?.metadata?.description || "由 WiKiMG profile 文档派生的轻量本体元数据。";

    return {
      philosophicalOntology: {
        metadata: {
          title: "WiKiMG Philosophical Placeholder",
          created_by: "wikimg",
          version: "1",
          description,
        },
      },
      formalOntology: {
        metadata: {
          title: "WiKiMG Formal Placeholder",
          created_by: "wikimg",
          version: "1",
          description,
        },
      },
      scientificOntology: {
        metadata: {
          title: "WiKiMG Scientific Placeholder",
          created_by: "wikimg",
          version: "1",
          description,
        },
      },
    };
  }

  async listEntities() {
    const knowledgeGraph = await this.getKnowledgeGraph();
    return Object.values(knowledgeGraph.entity_index);
  }

  async getEntityById(entityId) {
    const knowledgeGraph = await this.getKnowledgeGraph();
    return knowledgeGraph.entity_index[entityId];
  }

  async searchEntities(query) {
    const needle = normalizeText(query);
    if (!needle) {
      return [];
    }

    const entities = await this.listEntities();
    return entities.filter((entity) => {
      const haystacks = [
        entity.name,
        entity.definition,
        entity.domain,
        entity.layer,
        entity.type,
        JSON.stringify(entity.properties || {}),
      ];
      return haystacks.some((item) => normalizeText(item).includes(needle));
    });
  }

  async getRelatedEntities(entityId) {
    const knowledgeGraph = await this.getKnowledgeGraph();
    const related = knowledgeGraph.cross_references.filter((ref) => ref.source === entityId || ref.target === entityId);
    return related
      .map((ref) => {
        const relatedId = ref.source === entityId ? ref.target : ref.source;
        return knowledgeGraph.entity_index[relatedId];
      })
      .filter(Boolean);
  }

  async getAnalysisRecord() {
    return null;
  }

  async getSystemRecord() {
    return null;
  }

  async getEducationContent() {
    const dataset = await this.loadDataset();
    const document = this.findMetaDocument(dataset, "education");
    const payload = safeObject(document?.education_payload);
    if (Object.keys(payload).length > 0) {
      return payload;
    }

    return {
      featured_topic: {
        title: document?.title || "WiKiMG 入门导读",
        summary: document?.definition || document?.summary || "从文件真源理解当前知识平台。",
        audience: "第一次接触当前 demo 的用户",
        reading_time: "5 分钟",
        takeaways: unique([
          document?.summary,
          ...(document?.evidence || []),
        ]).slice(0, 3),
      },
      primers: [],
      scenarios: [],
      selected_entity_guide: null,
    };
  }

  async getAboutContent() {
    const dataset = await this.loadDataset();
    const document = this.findMetaDocument(dataset, "about");
    const payload = safeObject(document?.about_payload);
    if (Object.keys(payload).length > 0) {
      return payload;
    }

    return {
      platform: {
        name: document?.title || "WiKiMG 文件真源平台",
        vision: document?.summary || "以 WiKiMG 文档作为事实源。",
        description: document?.definition || "当前平台由 WiKiMG profile 文档派生而成。",
      },
      modules: [],
      workflow: [],
      roadmap: [],
    };
  }

  async getEditorTemplate() {
    const dataset = await this.loadDataset();
    const document = this.findEntityDocuments(dataset)[0];
    const seedEntity = document?.kimiwa || null;
    const suggestedRelations = unique((document?.relations || []).map((item) => item.target_ref).filter(Boolean))
      .slice(0, 3)
      .map((ref) => {
        const target = this.findDocumentByRef(dataset, ref);
        return target?.kimiwa?.name || target?.title || ref;
      });

    return {
      defaults: {
        name: seedEntity?.name || "新概念",
        type: seedEntity?.type || "未分类主题",
        domain: seedEntity?.domain || "智能养鱼",
        source: seedEntity?.source || "WiKiMG 草稿",
        definition: seedEntity?.definition || "请用一句话说明它是什么、属于什么、与什么相关。",
        properties: seedEntity?.properties || {
          状态: "草稿",
          用途: "待补充",
        },
      },
      suggestions: {
        recommended_type: seedEntity?.type || "未分类主题",
        suggested_relations: suggestedRelations.length > 0 ? suggestedRelations : ["智能养鱼系统概览", "Onenet 接入", "光照监测"],
        rdf_preview: `<${seedEntity?.name || "新概念"}> rdf:type <${seedEntity?.type || "未分类主题"}> .`,
        owl_preview: `Class: ${seedEntity?.name || "新概念"} SubClassOf: ${seedEntity?.domain || "智能养鱼"}`,
      },
    };
  }

  async getChatContext(question, entityId) {
    const dataset = await this.loadDataset();
    const knowledgeGraph = dataset.knowledgeGraph;
    const entity = entityId ? knowledgeGraph.entity_index[entityId] || null : null;
    const related = entity ? (await this.getRelatedEntities(entityId)).slice(0, 6) : [];
    const searchHits = (await this.searchEntities(question)).slice(0, 8);

    const currentDocument = entity ? this.findDocumentByEntityId(dataset, entity.id) : null;
    const relatedDocuments = related
      .map((item) => this.findDocumentByEntityId(dataset, item.id))
      .filter(Boolean)
      .slice(0, 4)
      .map((item) => this.toPromptDocument(item));
    const searchDocuments = searchHits
      .map((item) => this.findDocumentByEntityId(dataset, item.id))
      .filter(Boolean)
      .slice(0, 4)
      .map((item) => this.toPromptDocument(item));

    return {
      entity,
      related,
      searchHits,
      currentDocument: currentDocument ? this.toPromptDocument(currentDocument) : null,
      relatedDocuments,
      searchDocuments,
    };
  }

  findMetaDocument(dataset, metaRole) {
    return (dataset.documents || []).find((item) => item.meta_role === metaRole);
  }

  findEntityDocuments(dataset) {
    return (dataset.documents || []).filter((item) => item.kimiwa && item.page_kind !== "meta");
  }

  findDocumentByRef(dataset, ref) {
    return (dataset.documents || []).find((item) => item.ref === ref) || null;
  }

  findDocumentByEntityId(dataset, entityId) {
    return this.findEntityDocuments(dataset).find((item) => item.kimiwa?.id === entityId) || null;
  }

  toPromptDocument(document) {
    const sections = safeObject(document.sections);
    const excerpt = [
      document.summary,
      document.definition,
      sections["定义与定位"],
      sections["属性"],
      sections["证据来源"],
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 1500);

    return {
      ref: document.ref,
      title: document.title,
      page_kind: document.page_kind,
      layer: document.layer,
      definition: document.definition,
      summary: document.summary,
      excerpt,
      evidence: Array.isArray(document.evidence) ? document.evidence.slice(0, 4) : [],
      relations: Array.isArray(document.relations) ? document.relations.slice(0, 6) : [],
      source_path: path.relative(this.workspaceRoot, document.path),
    };
  }
}
