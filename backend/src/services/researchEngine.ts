import type { ResearchHistoryEntry, ResearchReport, ResearchSource, ResearchWorkflow } from "../types.js";
import { generateJson, getGeminiModelName } from "./gemini.js";
import { discoverResearchSources } from "./sourceDiscovery.js";

function fallbackReport(query: string, sources: ResearchSource[]): ResearchReport {
  return {
    title: `Research Brief: ${query}`,
    abstract: `${query} spans background concepts, current literature, and practical adoption signals. This brief organizes the topic into a research-friendly summary so the user can move from overview to focused literature review.`,
    keyFindings: [
      `${query} should be studied using both foundational references and recent academic work.`,
      `Recent papers and scholarly records suggest the field is evolving fast, so narrowing the topic by application area will improve report quality.`,
      `A strong presentation should compare definitions, methods, evidence quality, and real-world limitations rather than relying on a single source type.`,
      `The current sources indicate that the most useful next step is a scoped question with domain, geography, or time boundaries.`
    ],
    sources,
    conclusion: `This initial research pass shows that ${query} is broad enough to support a meaningful final report, but the clearest findings will come from narrowing the question and comparing a smaller set of high-quality sources in depth.`,
    followUpQuestions: [
      `Which recent papers define the strongest methods in ${query}?`,
      `What evaluation metrics are commonly used for ${query}?`,
      `What limitations or ethical risks appear most often in ${query}?`
    ],
    generatedAt: new Date().toISOString()
  };
}

function reportSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      abstract: { type: "string" },
      keyFindings: {
        type: "array",
        items: { type: "string" }
      },
      conclusion: { type: "string" },
      followUpQuestions: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["title", "abstract", "keyFindings", "conclusion", "followUpQuestions"]
  };
}

function expansionSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      expansions: { type: "array", items: { type: "string" } },
      subtopics: { type: "array", items: { type: "string" } },
      suggestedQuestions: { type: "array", items: { type: "string" } }
    },
    required: ["expansions", "subtopics", "suggestedQuestions"]
  };
}

function buildSourceDigest(sources: ResearchSource[]): string {
  return sources.map((source, index) => {
    return [
      `Source ${index + 1}`,
      `Title: ${source.title}`,
      `URL: ${source.url}`,
      `Type: ${source.sourceType}`,
      `Credibility: ${source.credibility}`,
      `Snippet: ${source.snippet}`
    ].join("\n");
  }).join("\n\n");
}

export async function createResearchReport(query: string, history: ResearchHistoryEntry[]): Promise<{ report: ResearchReport; workflow: ResearchWorkflow }> {
  const warnings: string[] = [];
  const stages = ["source-discovery", "synthesis"];
  const sources = await discoverResearchSources(query);

  if (sources.length === 0) {
    warnings.push("No live external sources were discovered, so the report relied on fallback reasoning.");
  }

  const historyDigest = history
    .slice(0, 3)
    .map((entry) => `Previous topic: ${entry.query}\nPrevious title: ${entry.report.title}`)
    .join("\n\n");

  let report = fallbackReport(query, sources);
  const modelUsed = getGeminiModelName();

  if (modelUsed && sources.length > 0) {
    try {
      const response = await generateJson<{
        title: string;
        abstract: string;
        keyFindings: string[];
        conclusion: string;
        followUpQuestions: string[];
      }>({
        systemInstruction: "You are a careful academic research assistant. Build concise, evidence-oriented reports without inventing sources.",
        prompt: [
          `User research query: ${query}`,
          historyDigest ? `Prior session context:\n${historyDigest}` : "",
          `Use only the source digest below when synthesizing the report.`,
          buildSourceDigest(sources),
          "Return a clear academic report with a title, abstract, 4 key findings, conclusion, and 3 follow-up questions."
        ].filter(Boolean).join("\n\n"),
        schema: reportSchema(),
        temperature: 0.35
      });

      if (response) {
        report = {
          title: response.title,
          abstract: response.abstract,
          keyFindings: response.keyFindings.slice(0, 4),
          conclusion: response.conclusion,
          followUpQuestions: response.followUpQuestions.slice(0, 3),
          sources,
          generatedAt: new Date().toISOString()
        };
      } else {
        warnings.push("Gemini returned an empty structured response, so a local fallback report was used.");
      }
    } catch {
      warnings.push("Gemini synthesis failed, so the report used a local fallback template.");
    }
  } else if (!modelUsed) {
    warnings.push("Gemini is not configured, so the report used local synthesis only.");
  }

  return {
    report,
    workflow: {
      searchQuery: query,
      sourcesAnalyzed: sources.length,
      warnings,
      usedSessionMemory: history.length > 0,
      modelUsed,
      stages
    }
  };
}

export async function createTopicExpansion(query: string): Promise<{
  expansions: string[];
  subtopics: string[];
  suggestedQuestions: string[];
}> {
  const modelUsed = getGeminiModelName();
  if (modelUsed) {
    try {
      const response = await generateJson<{
        expansions: string[];
        subtopics: string[];
        suggestedQuestions: string[];
      }>({
        systemInstruction: "You expand research questions into academically useful directions.",
        prompt: `Expand this research topic into broader angles, narrower subtopics, and sharper follow-up questions: ${query}`,
        schema: expansionSchema(),
        temperature: 0.4
      });

      if (response) {
        return {
          expansions: response.expansions.slice(0, 4),
          subtopics: response.subtopics.slice(0, 4),
          suggestedQuestions: response.suggestedQuestions.slice(0, 4)
        };
      }
    } catch {
      // Fall through to heuristic expansion below.
    }
  }

  return {
    expansions: [
      `${query} in industry adoption`,
      `${query} in policy and governance`,
      `${query} compared with traditional approaches`,
      `${query} for future research directions`
    ],
    subtopics: [
      `${query} datasets and benchmarks`,
      `${query} evaluation methods`,
      `${query} implementation constraints`,
      `${query} case studies`
    ],
    suggestedQuestions: [
      `What are the recent advances in ${query}?`,
      `How is ${query} evaluated in practice?`,
      `What risks or limitations are associated with ${query}?`,
      `Which domains benefit most from ${query}?`
    ]
  };
}
