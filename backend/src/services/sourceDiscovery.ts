import type { ResearchSource } from "../types.js";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source.local";
  }
}

function dedupeSources(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) {
      return false;
    }
    seen.add(source.url);
    return true;
  });
}

async function fetchWikipedia(query: string): Promise<ResearchSource[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json&origin=*`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const data = await response.json() as [string, string[], string[], string[]];
  const titles = data[1] ?? [];
  const descriptions = data[2] ?? [];
  const links = data[3] ?? [];

  return titles.map((title, index) => ({
    title,
    url: links[index] ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    snippet: descriptions[index] || `Reference overview for ${query}.`,
    domain: "wikipedia.org",
    sourceType: "reference",
    credibility: 0.65,
    publishedAt: null
  }));
}

function getTagValue(fragment: string, tag: string): string {
  const match = fragment.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "";
}

async function fetchArxiv(query: string): Promise<ResearchSource[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const entries = xml.split("<entry>").slice(1).map((entry) => entry.split("</entry>")[0] ?? "");

  return entries.map((entry) => {
    const title = getTagValue(entry, "title").replace(/\s+/g, " ").trim();
    const summary = getTagValue(entry, "summary").replace(/\s+/g, " ").trim();
    const publishedAt = getTagValue(entry, "published") || null;
    const id = getTagValue(entry, "id");

    return {
      title,
      url: id,
      snippet: summary.slice(0, 260),
      domain: "arxiv.org",
      sourceType: "academic" as const,
      credibility: 0.92,
      publishedAt
    };
  }).filter((entry) => entry.title && entry.url);
}

async function fetchCrossref(query: string): Promise<ResearchSource[]> {
  const url = `https://api.crossref.org/works?rows=3&query.bibliographic=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "askmynotes-research-assistant/1.0 (mailto:student@example.com)"
    }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as {
    message?: {
      items?: Array<{
        title?: string[];
        abstract?: string;
        URL?: string;
        DOI?: string;
        created?: { "date-time"?: string };
      }>;
    };
  };

  return (data.message?.items ?? []).map((item) => {
    const urlValue = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : "");
    return {
      title: item.title?.[0] ?? "Crossref record",
      url: urlValue,
      snippet: (item.abstract ?? "Scholarly metadata record related to the research query.")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 260),
      domain: domainOf(urlValue),
      sourceType: "academic" as const,
      credibility: 0.88,
      publishedAt: item.created?.["date-time"] ?? null
    };
  }).filter((entry) => entry.url);
}

export async function discoverResearchSources(query: string): Promise<ResearchSource[]> {
  const batches = await Promise.allSettled([
    fetchWikipedia(query),
    fetchArxiv(query),
    fetchCrossref(query)
  ]);

  const sources = batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
  return dedupeSources(sources).slice(0, 8);
}
