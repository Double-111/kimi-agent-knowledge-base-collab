import { readFile } from "node:fs/promises";
import path from "node:path";

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export class JsonKnowledgeBaseRepository {
  constructor(options) {
    this.dataRoot = options.dataRoot;
    this.dbFilePath = options.dbFilePath;
    this.cache = null;
  }

  async loadDataset() {
    if (this.cache) {
      return this.cache;
    }

    const [
      knowledgeGraph,
      philosophicalOntology,
      formalOntology,
      scientificOntology,
      knowledgeBaseDb,
    ] = await Promise.all([
      readJson(path.join(this.dataRoot, "knowledge-graph", "unified-knowledge-graph.json")),
      readJson(path.join(this.dataRoot, "core-ontology", "philosophical-ontology.json")),
      readJson(path.join(this.dataRoot, "core-ontology", "formal-ontology.json")),
      readJson(path.join(this.dataRoot, "domain-ontology", "scientific-ontology.json")),
      readJson(this.dbFilePath),
    ]);

    this.cache = {
      knowledgeGraph,
      philosophicalOntology,
      formalOntology,
      scientificOntology,
      knowledgeBaseDb,
    };

    return this.cache;
  }

  async getKnowledgeGraph() {
    const dataset = await this.loadDataset();
    return dataset.knowledgeGraph;
  }

  async getOntologies() {
    const dataset = await this.loadDataset();
    return {
      philosophicalOntology: dataset.philosophicalOntology,
      formalOntology: dataset.formalOntology,
      scientificOntology: dataset.scientificOntology,
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
    const knowledgeGraph = await this.getKnowledgeGraph();
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

  async getRelatedEntities(entityId) {
    const knowledgeGraph = await this.getKnowledgeGraph();
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

  async getAnalysisRecord(entityName) {
    const dataset = await this.loadDataset();
    return dataset.knowledgeBaseDb.analysis_records[entityName] || null;
  }

  async getSystemRecord(entityName) {
    const dataset = await this.loadDataset();
    return dataset.knowledgeBaseDb.system_records[entityName] || null;
  }

  async getEducationContent() {
    const dataset = await this.loadDataset();
    return dataset.knowledgeBaseDb.education_content;
  }

  async getAboutContent() {
    const dataset = await this.loadDataset();
    return dataset.knowledgeBaseDb.about_content;
  }

  async getEditorTemplate() {
    const dataset = await this.loadDataset();
    return dataset.knowledgeBaseDb.editor_template;
  }
}
