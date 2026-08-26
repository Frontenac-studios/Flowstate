import { describe, expect, it } from "vitest";

import { parseCsv, parseCsvObjects } from "./parse-csv";

describe("parseCsv", () => {
  it("splits simple rows and cells", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('name,note\n"Circa 1200, Llc",ok')).toEqual([
      ["name", "note"],
      ["Circa 1200, Llc", "ok"],
    ]);
  });

  it("unescapes doubled quotes and handles CRLF + trailing newline", () => {
    expect(parseCsv('a\r\n"say ""hi"""\r\n')).toEqual([["a"], ['say "hi"']]);
  });
});

describe("parseCsvObjects", () => {
  it("keys cells by trimmed header and drops a trailing blank line", () => {
    const objs = parseCsvObjects("Description,Amount\nCoffee,3.50\n\n");
    expect(objs).toEqual([{ Description: "Coffee", Amount: "3.50" }]);
  });
});
