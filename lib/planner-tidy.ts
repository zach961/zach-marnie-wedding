// Keeps the "Vendors & Action Items" tab tidy: items marked Done, Paid or Not needed move down to the
// Done section, and anything reopened moves back under its own heading. Rows are moved whole, so
// their contents, formulas and formatting travel with them.

import { sheets, tab } from "./google-sheets";

const PLANNER_TAB = "Vendors & Action Items";
const FINISHED = ["done", "paid", "not needed"];
const CATEGORY_COL = 13; // hidden column N holds each item's section

type Cell = string | number | boolean | null | undefined;
export type Move = { from: number; to: number }; // 0-based rows; `to` is the row to insert before

const text = (v: Cell) => String(v ?? "").trim();

/** Works out the row moves needed, in order. Each move assumes the ones before it have been made. */
export function planMoves(grid: Cell[][]): Move[] {
  // Work on a list of row kinds so each move can be simulated before planning the next.
  const rows = grid.map((r) => {
    const row = r || [];
    const category = text(row[CATEGORY_COL]);
    const filled = row.filter((c, i) => i !== CATEGORY_COL && text(c)).length;
    if (category) return { kind: "item" as const, category, finished: FINISHED.includes(text(row[1]).toLowerCase()) };
    if (filled === 1 && text(row[0])) return { kind: "heading" as const, title: text(row[0]).toLowerCase() };
    return { kind: "other" as const };
  });
  while (rows.length && rows[rows.length - 1].kind === "other") rows.pop();

  const moves: Move[] = [];
  const doneAt = () => rows.findIndex((r) => r.kind === "heading" && r.title === "done");
  if (doneAt() < 0) return moves;

  for (let guard = 0; guard < 200; guard++) {
    const done = doneAt();
    // An item above the Done heading that is finished goes to the very bottom.
    const finished = rows.findIndex((r, i) => i < done && r.kind === "item" && r.finished);
    if (finished >= 0) {
      moves.push({ from: finished, to: rows.length });
      rows.push(rows.splice(finished, 1)[0]);
      continue;
    }
    // An item below it that is no longer finished goes back to the end of its own section.
    const reopened = rows.findIndex((r, i) => i > done && r.kind === "item" && !r.finished);
    if (reopened < 0) break;
    const item = rows[reopened];
    const heading = rows.findIndex((r, i) => i < done && r.kind === "heading" && item.kind === "item" && r.title === item.category.toLowerCase());
    if (heading < 0) { (item as { finished: boolean }).finished = true; continue; } // no section to return to: leave it where it is
    let to = heading + 1;
    while (to < done && rows[to].kind === "item") to++;
    moves.push({ from: reopened, to });
    rows.splice(to, 0, rows.splice(reopened, 1)[0]);
  }
  return moves;
}

/** Applies the moves to the sheet. Does nothing if the tab isn't there or is already tidy. */
export async function tidyPlanner(tabs: { properties: { sheetId: number; title: string } }[]) {
  const meta = tabs.find((s) => s.properties.title.trim().toLowerCase() === PLANNER_TAB.toLowerCase());
  if (!meta) return 0;
  const read = await sheets<{ values?: Cell[][] }>(`/values/${encodeURIComponent(`${tab(meta.properties.title)}!A1:N`)}`);
  const moves = planMoves(read.values || []);
  if (!moves.length) return 0;
  await sheets(":batchUpdate", {
    requests: moves.map((m) => ({
      moveDimension: {
        source: { sheetId: meta.properties.sheetId, dimension: "ROWS", startIndex: m.from, endIndex: m.from + 1 },
        destinationIndex: m.to,
      },
    })),
  });
  return moves.length;
}
