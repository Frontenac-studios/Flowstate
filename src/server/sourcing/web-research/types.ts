/**
 * The web-research boundary (W10h). Everything above this interface is vendor-free:
 * the pipeline, the prompts and the router know only `WebResearchAdapter`.
 *
 * The boundary exists because the vendor decision is genuinely reversible and was
 * taken on convenience, not conviction — v1 runs on OpenRouter's web plugin because
 * the app already holds an OpenRouter key, so no second account, key or bill enters
 * the project. Swapping in a dedicated search API later should be one new file and
 * one line in `index.ts`, never a change to the calling code. (This is also the shape
 * W10j's enrichment adapter takes.)
 */

export type ResearchRequest = {
  companyName: string;
  /** What the owner already believes — the adapter should verify, not repeat, it. */
  companyNotes: string;
  /** ICP segment descriptions, so the search chases facts that will matter. */
  segments: { id: string; label: string; firmographics: string }[];
  /** Hard cap on billed results. Each one costs money. */
  maxResults: number;
};

export type ResearchSource = { title: string; url: string };

export type ResearchResponse = {
  /** The research write-up as prose. Distilled into `CompanyFacts` by the caller. */
  text: string;
  /**
   * The pages the search actually consulted, as reported by the vendor.
   *
   * These are the citations of record. The write-up's own mentions of a URL are text
   * a model produced and could have invented; these came back from the search engine
   * alongside the results, so they are the ones stored and shown as "sources".
   */
  sources: ResearchSource[];
  /** Which vendor produced this, recorded on the lead for provenance. */
  provider: string;
};

export interface WebResearchAdapter {
  /** A stable id stored alongside the facts, so old rows say where they came from. */
  readonly id: string;
  research(request: ResearchRequest): Promise<ResearchResponse>;
}
