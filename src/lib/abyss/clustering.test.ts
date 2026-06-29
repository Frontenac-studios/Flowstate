import { describe, expect, it } from "vitest";

import { clusterByEmbedding, selectEmergingCluster, type ClusterableItem } from "./clustering";

// Two well-separated directions: the "a" family points along [1,0], the "b" family
// along [0,1]. Within a family cosine ≈ 1; across families ≈ 0.
const aFamily: ClusterableItem[] = [
  { id: "a1", embedding: [1, 0] },
  { id: "a2", embedding: [0.95, 0.05] },
  { id: "a3", embedding: [0.9, 0.1] },
];
const bPair: ClusterableItem[] = [
  { id: "b1", embedding: [0, 1] },
  { id: "b2", embedding: [0.05, 0.95] },
];

describe("clusterByEmbedding", () => {
  it("groups a cohesive family and drops sub-minimum clusters", () => {
    const clusters = clusterByEmbedding([...aFamily, ...bPair]);
    // default minSize 3 → only the a-family qualifies
    expect(clusters).toHaveLength(1);
    expect(clusters[0].ids.sort()).toEqual(["a1", "a2", "a3"]);
    expect(clusters[0].cohesion).toBeGreaterThan(0.9);
  });

  it("includes smaller clusters when minSize allows", () => {
    const clusters = clusterByEmbedding([...aFamily, ...bPair], { minSize: 2 });
    expect(clusters).toHaveLength(2);
    // strongest-first: the 3-item family before the pair
    expect(clusters[0].ids).toHaveLength(3);
    expect(clusters[1].ids.sort()).toEqual(["b1", "b2"]);
  });

  it("skips items without an embedding", () => {
    const clusters = clusterByEmbedding(
      [...aFamily, { id: "none", embedding: null }, { id: "empty", embedding: [] }],
      { minSize: 2 }
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].ids).not.toContain("none");
    expect(clusters[0].ids).not.toContain("empty");
  });

  it("returns nothing when the threshold separates everything", () => {
    const clusters = clusterByEmbedding(aFamily, { threshold: 0.999, minSize: 2 });
    // [1,0] vs [0.9,0.1] ≈ 0.994 < 0.999 → no links
    expect(clusters).toHaveLength(0);
  });

  it("is empty for no embedded items", () => {
    expect(clusterByEmbedding([{ id: "x", embedding: null }])).toEqual([]);
  });
});

describe("selectEmergingCluster", () => {
  it("returns the strongest cluster", () => {
    const cluster = selectEmergingCluster([...aFamily, ...bPair]);
    expect(cluster?.ids.sort()).toEqual(["a1", "a2", "a3"]);
  });

  it("returns null when nothing qualifies", () => {
    expect(selectEmergingCluster(bPair)).toBeNull(); // pair < default minSize 3
  });
});
