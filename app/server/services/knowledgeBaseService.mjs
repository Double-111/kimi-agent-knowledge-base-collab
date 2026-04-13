export class KnowledgeBaseService {
  constructor(repository) {
    this.repository = repository;
  }

  async getKnowledgeGraph() {
    return this.repository.getKnowledgeGraph();
  }

  async getOntologies() {
    return this.repository.getOntologies();
  }

  async listEntities() {
    return this.repository.listEntities();
  }

  async getEntityDetail(entityId) {
    const entity = await this.repository.getEntityById(entityId);
    if (!entity) {
      return null;
    }

    const relatedEntities = await this.repository.getRelatedEntities(entityId);
    return { entity, relatedEntities };
  }

  async searchEntities(query) {
    return this.repository.searchEntities(query);
  }

  async collectChatContext(question, entityId) {
    if (typeof this.repository.getChatContext === "function") {
      const specializedContext = await this.repository.getChatContext(question, entityId);
      if (specializedContext) {
        return specializedContext;
      }
    }

    const knowledgeGraph = await this.repository.getKnowledgeGraph();
    const entity = entityId ? knowledgeGraph.entity_index[entityId] : null;
    const related = entity ? (await this.repository.getRelatedEntities(entityId)).slice(0, 6) : [];
    const searchHits = (await this.repository.searchEntities(question)).slice(0, 8);

    return { entity, related, searchHits };
  }

  async getAnalysis(query, entityId) {
    const entityName = await this.resolveEntityName(query, entityId);
    return (await this.repository.getAnalysisRecord(entityName))
      || this.buildGenericAnalysisRecord(entityName);
  }

  async getSystemAnalysis(query, entityId) {
    const entityName = await this.resolveEntityName(query, entityId);
    return (await this.repository.getSystemRecord(entityName))
      || this.buildGenericSystemRecord(entityName);
  }

  async getEducationContent(entityId) {
    const entity = entityId ? await this.repository.getEntityById(entityId) : null;
    const content = await this.repository.getEducationContent();

    return {
      ...content,
      selected_entity_guide: entity
        ? {
            entity: entity.name,
            why_it_matters: `${entity.name} 是理解 ${entity.domain} 领域的一个高频入口，适合拿来建立整体框架。`,
            beginner_angle: `先把 ${entity.name} 当作一个“${entity.type}”来理解，再结合它的定义和相关实体去定位上下文。`,
            connected_concepts: (await this.repository.getRelatedEntities(entity.id))
              .slice(0, 4)
              .map((item) => item.name),
          }
        : content.selected_entity_guide ?? null,
    };
  }

  async getAboutContent() {
    const knowledgeGraph = await this.repository.getKnowledgeGraph();
    const baseContent = await this.repository.getAboutContent();

    return {
      ...baseContent,
      metrics: {
        provider: process.env.KNOWLEDGE_BASE_PROVIDER || "json",
        entities: knowledgeGraph.statistics.total_entities,
        relations: knowledgeGraph.statistics.total_relations,
        domains: knowledgeGraph.statistics.domains.length,
        levels: knowledgeGraph.statistics.levels.length,
        layers: Array.isArray(knowledgeGraph.statistics.layers) ? knowledgeGraph.statistics.layers.length : 0,
      },
    };
  }

  async getEditorWorkspace(entityId) {
    const entity = entityId ? await this.repository.getEntityById(entityId) : null;
    const template = await this.repository.getEditorTemplate();
    const fallbackEntity = entity || (await this.repository.listEntities())[0] || null;
    const related = fallbackEntity
      ? (await this.repository.getRelatedEntities(fallbackEntity.id)).slice(0, 4)
      : [];

    return {
      entity_id: fallbackEntity?.id,
      name: fallbackEntity?.name || template.defaults.name,
      type: fallbackEntity?.type || template.defaults.type,
      domain: fallbackEntity?.domain || template.defaults.domain,
      source: fallbackEntity?.source || template.defaults.source,
      definition: fallbackEntity?.definition || template.defaults.definition,
      properties_text: JSON.stringify(fallbackEntity?.properties || template.defaults.properties, null, 2),
      suggestions: {
        recommended_type: fallbackEntity?.type || template.suggestions.recommended_type,
        suggested_relations: related.length > 0
          ? related.map((item) => item.name)
          : template.suggestions.suggested_relations,
        rdf_preview: `<${fallbackEntity?.name || template.defaults.name}> rdf:type <${fallbackEntity?.type || template.defaults.type}> .`,
        owl_preview: `Class: ${fallbackEntity?.name || template.defaults.name} SubClassOf: ${fallbackEntity?.domain || template.defaults.domain}`,
      },
    };
  }

  async previewEditorDraft(input) {
    const warnings = [];
    if (!input.definition || input.definition.trim().length < 20) {
      warnings.push("定义太短，建议至少说明对象是什么、属于哪个层级、和什么对象相关。");
    }

    if (!input.domain || !input.type) {
      warnings.push("领域和类型最好都明确，否则后续很难接入真实数据库检索。");
    }

    const safeName = input.name?.trim() || "未命名概念";
    const safeType = input.type?.trim() || "待定义类";
    const safeDomain = input.domain?.trim() || "待定义领域";

    return {
      summary: `${safeName} 将作为 ${safeDomain} 下的 ${safeType} 被记录，当前定义会被用于检索、展示和问答上下文。`,
      rdf: `<${safeName}> rdf:type <${safeType}> .\n<${safeName}> <belongsToDomain> <${safeDomain}> .`,
      owl: `Class: ${safeName}\n  SubClassOf: ${safeDomain}\n  Annotations: rdfs:comment "${(input.definition || "").replaceAll('"', '\\"')}"`,
      warnings,
    };
  }

  async resolveEntityName(query, entityId) {
    if (entityId) {
      const entity = await this.repository.getEntityById(entityId);
      if (entity) {
        return entity.name;
      }
    }

    const matches = await this.repository.searchEntities(query);
    const exactMatch = matches.find((entity) => entity.name === query.trim());
    return exactMatch?.name || query.trim();
  }

  async buildGenericAnalysisRecord(entityName) {
    const matches = await this.repository.searchEntities(entityName);
    const entity = matches.find((item) => item.name === entityName) || null;
    const related = entity ? (await this.repository.getRelatedEntities(entity.id)).slice(0, 4) : [];

    return {
      entity_name: entityName,
      primary_level: entity?.domain || "待分析",
      secondary_levels: related
        .map((item) => item.domain)
        .filter((value, index, array) => value && array.indexOf(value) === index)
        .slice(0, 3),
      ontology_breakdown: {
        entity_level: {
          main_level: entity?.type || "待识别概念",
          physical_basis: entity?.definition || "需要进一步补充实体定义和物质基础",
          social_dimension: related.length > 0
            ? `当前知识库中与其相连的概念包括：${related.map((item) => item.name).join("、")}`
            : "当前知识库尚未记录足够的社会或系统语境",
        },
        essential_attributes: [
          {
            attribute: "核心定义",
            description: entity?.definition || "需要从知识库或外部资料补充定义",
            necessity: "必要",
          },
        ],
        accidental_attributes: [
          {
            attribute: "关联领域",
            examples: [entity?.domain || "未知领域"],
          },
        ],
        components: related.map((item) => ({
          part: item.name,
          function: item.definition,
          ontology_relation: "知识图谱关联",
        })),
        relations: related.map((item) => ({
          relation: "相关概念",
          target: item.name,
          description: item.definition,
        })),
        ontological_questions: [
          {
            question: `${entityName}在当前知识库中属于什么本体层级？`,
            discussion: entity
              ? `可先从 ${entity.domain} / ${entity.type} 角度定位，再扩展到更高层级。`
              : "当前知识库尚未直接命中该对象，需要补充数据。",
          },
        ],
        formalization: {
          RDF: `<${entityName}> rdf:type <${entity?.type || "待定义类"}> .`,
          OWL: `Class: ${entityName} SubClassOf: ${entity?.domain || "待定义"}`,
        },
      },
    };
  }

  async buildGenericSystemRecord(entityName) {
    const matches = await this.repository.searchEntities(entityName);
    const entity = matches.find((item) => item.name === entityName) || null;
    const related = entity ? (await this.repository.getRelatedEntities(entity.id)).slice(0, 4) : [];

    return {
      entity: entityName,
      holistic_properties: [
        `${entityName}作为概念节点的整体性来源于其与其他概念的关联网络`,
        "系统属性需要结合环境、边界和反馈回路一起理解",
      ],
      boundary: {
        physical: entity?.definition || "当前知识库未记录明确的物理边界",
        functional: entity ? `以 ${entity.domain} 领域中的角色与作用来界定` : "需要补充功能描述",
        cognitive: "观察者的分类方式会影响该对象被如何识别",
        dynamic: "在不同上下文中，其系统边界可能发生伸缩",
      },
      environment: {
        description: entity ? `${entityName} 当前被放置在 ${entity.domain} 领域中理解` : "当前知识库中没有足够的环境描述",
        inputs: related.length > 0 ? related.map((item) => item.name) : ["待补充输入条件"],
        outputs: ["概念解释", "系统角色", "关系定位"],
      },
      feedback: {
        negative: ["知识库定义会约束过度泛化的理解"],
        positive: ["新增关联和语境会放大该对象的系统意义"],
      },
      hierarchy: {
        subsystems: related.map((item) => item.name),
        supersystems: entity ? [entity.domain, entity.type] : ["待补充上位系统"],
      },
      emergence_examples: [
        "节点关系增多会带来更清晰的系统位置",
        "上下文丰富后会出现新的解释能力",
      ],
      systems_questions: [
        {
          question: `${entityName}的系统边界如何界定？`,
          analysis: "可以先从定义、关系和使用场景三个维度来判断。",
        },
      ],
    };
  }
}
