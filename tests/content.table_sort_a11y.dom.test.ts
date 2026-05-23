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
