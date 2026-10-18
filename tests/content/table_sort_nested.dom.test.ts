import { describe, expect, it } from "vitest";
import { enableSingleTable, enableTableSort } from "@/content/table-sort";

function createNestedTable(): HTMLTableElement {
  document.body.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>B</td>
          <td>
            <table>
              <thead>
                <tr><th>Inner Name</th><th>Inner Score</th></tr>
              </thead>
              <tbody>
                <tr><td>inner-b</td><td>2</td></tr>
                <tr><td>inner-a</td><td>1</td></tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td>A</td>
          <td><span>plain</span></td>
        </tr>
      </tbody>
    </table>
  `;
  const table = document.querySelector("table");
  if (!table) {
    throw new Error("table not found");
  }
  return table;
}

function outerColumnValues(
  table: HTMLTableElement,
  columnIndex: number
): (string | null | undefined)[] {
  return Array.from(table.querySelectorAll(":scope > tbody > tr")).map(
    (row) => row.cells[columnIndex]?.textContent
  );
}

function innerColumnValues(
  innerTable: HTMLTableElement,
  columnIndex: number
): (string | null | undefined)[] {
  return Array.from(innerTable.querySelectorAll(":scope > tbody > tr")).map(
    (row) => row.cells[columnIndex]?.textContent
  );
}

function clickHeader(header: HTMLTableCellElement): void {
  header.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("table sort with nested tables", () => {
  it("clicking a nested header sorts only the inner table", () => {
    const outerTable = createNestedTable();
    enableSingleTable(outerTable);

    const innerTable = document.querySelector("td table");
    if (!innerTable) {
      throw new Error("nested table not found");
    }
    enableSingleTable(innerTable);

    const innerHeader = innerTable.querySelector("th");
    if (!innerHeader) {
      throw new Error("nested header not found");
    }
    clickHeader(innerHeader);

    expect(outerColumnValues(outerTable, 0)).toEqual(["B", "A"]);
    expect(innerColumnValues(innerTable, 0)).toEqual(["inner-a", "inner-b"]);
  });

  it("clicking an outer header leaves the inner table and its aria-sort untouched", () => {
    const outerTable = createNestedTable();
    enableSingleTable(outerTable);

    const innerTable = document.querySelector("td table");
    if (!innerTable) {
      throw new Error("nested table not found");
    }

    const outerHeader = outerTable.querySelector("thead th");
    if (!outerHeader) {
      throw new Error("outer header not found");
    }
    clickHeader(outerHeader);

    expect(outerColumnValues(outerTable, 0)).toEqual(["A", "B"]);
    expect(innerColumnValues(innerTable, 0)).toEqual(["inner-b", "inner-a"]);

    const innerHeaders = innerTable.querySelectorAll("th");
    for (const header of innerHeaders) {
      expect(header.getAttribute("aria-sort")).toBeNull();
    }
  });

  it("enables each nested header once via the document-wide loop", () => {
    createNestedTable();
    enableTableSort(() => undefined);

    const outerTable = document.querySelector("table");
    const innerTable = document.querySelector("td table");
    if (!(outerTable && innerTable)) {
      throw new Error("tables not found");
    }

    const outerHeaders = outerTable.querySelectorAll(":scope > thead th");
    expect(outerHeaders).toHaveLength(2);
    for (const header of outerHeaders) {
      expect(header.style.cursor).toBe("pointer");
      expect(header.getAttribute("aria-sort")).toBe("none");
    }

    // ネスト table 自身の enableSingleTable が装飾を担当する
    const innerHeaders = Array.from(innerTable.querySelectorAll("th"));
    expect(innerHeaders).toHaveLength(2);
    for (const header of innerHeaders) {
      expect(header.style.cursor).toBe("pointer");
      expect(header.tabIndex).toBe(0);
    }

    const [innerHeader] = innerHeaders;
    if (!innerHeader) {
      throw new Error("nested header not found");
    }
    clickHeader(innerHeader);

    expect(outerColumnValues(outerTable, 0)).toEqual(["B", "A"]);
    expect(innerColumnValues(innerTable, 0)).toEqual(["inner-a", "inner-b"]);
  });
});
