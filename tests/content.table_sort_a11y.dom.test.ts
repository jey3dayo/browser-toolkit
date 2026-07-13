import { describe, expect, it } from "vitest";
import { enableSingleTable } from "@/content/table-sort";

function createTable(): HTMLTableElement {
  document.body.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>B</td><td>2</td></tr>
        <tr><td>A</td><td>1</td></tr>
      </tbody>
    </table>
  `;
  const table = document.querySelector("table");
  if (!table) {
    throw new Error("table not found");
  }
  return table;
}

describe("table sort accessibility", () => {
  it("makes sortable headers keyboard operable and exposes sort direction", () => {
    const table = createTable();
    enableSingleTable(table);

    const headers = table.querySelectorAll("th");
    expect(headers[0]?.tabIndex).toBe(0);
    expect(headers[0]?.getAttribute("role")).toBeNull();
    expect(headers[0]?.getAttribute("aria-sort")).toBe("none");

    headers[0]?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "Enter" })
    );

    const firstColumn = Array.from(table.querySelectorAll("tbody tr")).map(
      (row) => row.cells[0]?.textContent
    );
    expect(firstColumn).toEqual(["A", "B"]);
    expect(headers[0]?.getAttribute("aria-sort")).toBe("ascending");
    expect(headers[1]?.getAttribute("aria-sort")).toBe("none");
  });
});

function buildTable(rowsHtml: string): HTMLTableElement {
  document.body.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
  const table = document.querySelector("table");
  if (!table) {
    throw new Error("table not found");
  }
  return table;
}

function columnValues(
  table: HTMLTableElement,
  columnIndex: number
): (string | null | undefined)[] {
  return Array.from(table.querySelectorAll("tbody tr")).map(
    (row) => row.cells[columnIndex]?.textContent
  );
}

function clickHeader(table: HTMLTableElement, columnIndex: number): void {
  const header = table.querySelectorAll("th")[columnIndex];
  header?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("table sort ordering", () => {
  it("sorts a purely numeric column ascending then descending", () => {
    const table = buildTable(`
      <tr><td>a</td><td>10</td></tr>
      <tr><td>b</td><td>2</td></tr>
      <tr><td>c</td><td>1</td></tr>
    `);
    enableSingleTable(table);

    clickHeader(table, 1);
    expect(columnValues(table, 1)).toEqual(["1", "2", "10"]);

    clickHeader(table, 1);
    expect(columnValues(table, 1)).toEqual(["10", "2", "1"]);
  });

  it("sorts a Japanese-locale string column ascending then descending", () => {
    const table = buildTable(`
      <tr><td>う</td><td>1</td></tr>
      <tr><td>あ</td><td>2</td></tr>
      <tr><td>い</td><td>3</td></tr>
    `);
    enableSingleTable(table);

    clickHeader(table, 0);
    expect(columnValues(table, 0)).toEqual(["あ", "い", "う"]);

    clickHeader(table, 0);
    expect(columnValues(table, 0)).toEqual(["う", "い", "あ"]);
  });

  it("falls back to localeCompare when a column mixes numeric and non-numeric text", () => {
    const values = ["10", "apple", "2"];
    const table = buildTable(
      values.map((value) => `<tr><td>x</td><td>${value}</td></tr>`).join("")
    );
    enableSingleTable(table);

    clickHeader(table, 1);

    // Characterization: mirrors the OLD per-pair comparator exactly. Each
    // pair is compared independently: if BOTH operands parse as numbers,
    // numeric compare is used; otherwise localeCompare("ja") is used. This is
    // NOT equivalent to a single column-wide localeCompare sort, so derive
    // the expected order the same way the old comparator would: "10" vs "2"
    // are both numeric (2 < 10), while "apple" forces localeCompare against
    // either numeric operand.
    const expectedAscending = ["2", "10", "apple"];
    expect(columnValues(table, 1)).toEqual(expectedAscending);
  });

  it("treats a missing cell as an empty string via the ?? fallback", () => {
    const table = buildTable(`
      <tr><td>b</td><td>b</td></tr>
      <tr><td>a-only-cell</td></tr>
    `);
    enableSingleTable(table);

    expect(() => clickHeader(table, 1)).not.toThrow();

    // OLD comparator: missing cell -> "" ; "".localeCompare("b","ja") < 0,
    // so the row with the missing cell sorts first ascending.
    expect(columnValues(table, 0)).toEqual(["a-only-cell", "b"]);
  });
});
