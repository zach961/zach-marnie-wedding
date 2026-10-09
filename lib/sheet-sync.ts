// Keeps the "Wedding Planning" Google Sheet in step with the replies.
//
// Guest List tab: four columns to the right of the table (RSVP, Adults coming, RSVP name(s), Replied).
// RSVPs tab: a log of every reply, one row per person, with anyone not on the guest list flagged.
// Nothing else in the sheet is written to.

import { colLetter, serviceAccount, SheetError, sheetId, sheets, tab } from "./google-sheets";
import { autoLink, compute, flattenPeople, Grid, GuestLayout, OUR_HEADERS, parseGuestGrid, seenKeys, Summary } from "./sheet-match";
import { tidyPlanner } from "./planner-tidy";
import { getSyncStatus, listRsvps, raiseFlag, setSyncStatus, SheetSyncStatus, takeFlag, tryLock, unlock } from "./store";

const GUEST_TAB = "Guest List";
const RSVP_TAB = "RSVPs";
const TZ = "Australia/Brisbane";

// Layout of the RSVPs tab (rows are 1-based, as shown in the sheet).
const HEAD_ROW = 7;
const FIRST_ROW = 8;
const HEADERS = ["Replied", "Name", "Attending", "Guest list match", "Note", "Also in this reply",
  "Adults in reply", "Children in reply", "Reply ID", "Timestamp", "Transport"];
const LAST_COL = colLetter(HEADERS.length - 1);

const rgb = (hex: string) => ({
  red: parseInt(hex.slice(1, 3), 16) / 255, green: parseInt(hex.slice(3, 5), 16) / 255, blue: parseInt(hex.slice(5, 7), 16) / 255,
});
const FILL: Record<string, string> = { Attending: "#d9ead3", Declined: "#f4cccc", "Part attending": "#fff2cc" };
const FLAG = "#fce5cd";

function when(iso: string, long: boolean) {
  if (!iso) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return long ? `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}` : `${p.day} ${p.month}`;
}

export function sheetConnection() {
  const account = serviceAccount();
  const missing = [
    ...(account ? [] : ["GOOGLE_SERVICE_ACCOUNT_KEY"]),
    ...(sheetId() ? [] : ["GOOGLE_SHEET_ID"]),
  ];
  return { configured: missing.length === 0, missing, email: account?.client_email || "" };
}

type TabMeta = { properties: { sheetId: number; title: string; gridProperties?: { columnCount?: number } } };

/** Adds our four columns to the right of the guest table the first time. */
async function addGuestColumns(meta: TabMeta, grid: Grid, layout: GuestLayout) {
  const id = meta.properties.sheetId;
  const first = Math.max(0, ...grid.map((row) => (row || []).length));
  const short = first + OUR_HEADERS.length - (meta.properties.gridProperties?.columnCount || 0);
  const requests: unknown[] = [];
  if (short > 0) requests.push({ appendDimension: { sheetId: id, dimension: "COLUMNS", length: short } });
  for (const h of layout.headerRows) {
    requests.push({
      updateCells: {
        range: { sheetId: id, startRowIndex: h, endRowIndex: h + 1, startColumnIndex: first, endColumnIndex: first + OUR_HEADERS.length },
        rows: [{ values: OUR_HEADERS.map((text) => ({ userEnteredValue: { stringValue: text }, userEnteredFormat: { textFormat: { bold: true } } })) }],
        fields: "userEnteredValue,userEnteredFormat.textFormat.bold",
      },
    });
  }
  // Match the table's own look: copy the formatting of the column just left of ours (headers and guest rows).
  const like = first - 1;
  if (like >= 0) {
    const copy = (startRowIndex: number, endRowIndex: number) => requests.push({
      copyPaste: {
        source: { sheetId: id, startRowIndex, endRowIndex, startColumnIndex: like - 1 >= 0 ? like - 1 : like, endColumnIndex: (like - 1 >= 0 ? like - 1 : like) + 1 },
        destination: { sheetId: id, startRowIndex, endRowIndex, startColumnIndex: first, endColumnIndex: first + OUR_HEADERS.length },
        pasteType: "PASTE_FORMAT",
      },
    });
    for (const h of layout.headerRows) copy(h, h + 1);
    let start = -1;
    layout.guests.forEach((g, i) => {
      if (start < 0) start = g.r;
      const next = layout.guests[i + 1];
      if (!next || next.r !== g.r + 1) { copy(start, g.r + 1); start = -1; }
    });
  }
  [120, 110, 240, 90].forEach((pixelSize, i) => requests.push({
    updateDimensionProperties: {
      range: { sheetId: id, dimension: "COLUMNS", startIndex: first + i, endIndex: first + i + 1 },
      properties: { pixelSize }, fields: "pixelSize",
    },
  }));
  await sheets(":batchUpdate", { requests });
  layout.cols.rsvp = first;
  layout.cols.coming = first + 1;
  layout.cols.link = first + 2;
  layout.cols.replied = first + 3;
}

async function createRsvpTab(): Promise<TabMeta> {
  const made = await sheets(":batchUpdate", {
    requests: [{ addSheet: { properties: { title: RSVP_TAB, gridProperties: { rowCount: 1000, columnCount: HEADERS.length, frozenRowCount: HEAD_ROW } } } }],
  });
  const meta: TabMeta = { properties: made.replies[0].addSheet.properties };
  const id = meta.properties.sheetId;
  const bold = (row: number, size?: number) => ({
    repeatCell: {
      range: { sheetId: id, startRowIndex: row - 1, endRowIndex: row },
      cell: { userEnteredFormat: { textFormat: size ? { bold: true, fontSize: size } : { bold: true } } },
      fields: size ? "userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.fontSize" : "userEnteredFormat.textFormat.bold",
    },
  });
  await sheets(":batchUpdate", {
    requests: [
      bold(1, 14), bold(4), bold(HEAD_ROW),
      { repeatCell: {
        range: { sheetId: id, startRowIndex: HEAD_ROW - 1, endRowIndex: HEAD_ROW },
        cell: { userEnteredFormat: { backgroundColor: rgb("#f8f3ea") } }, fields: "userEnteredFormat.backgroundColor",
      } },
      { repeatCell: {
        range: { sheetId: id, startRowIndex: HEAD_ROW, startColumnIndex: 4, endColumnIndex: 6 },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } }, fields: "userEnteredFormat.wrapStrategy",
      } },
      { setBasicFilter: { filter: { range: { sheetId: id, startRowIndex: HEAD_ROW - 1, startColumnIndex: 0, endColumnIndex: HEADERS.length } } } },
      ...[150, 200, 90, 200, 260, 240, 110, 120, 110, 110, 100].map((pixelSize, i) => ({
        updateDimensionProperties: { range: { sheetId: id, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize }, fields: "pixelSize" },
      })),
    ],
  });
  return meta;
}

async function runSync(): Promise<Summary> {
  const meta = await sheets<{ sheets: TabMeta[] }>("?fields=sheets.properties");
  const find = (title: string) => meta.sheets.find((s) => s.properties.title.trim().toLowerCase() === title.toLowerCase());
  const guestMeta = find(GUEST_TAB);
  if (!guestMeta) throw new SheetError(`Couldn't find a tab called "${GUEST_TAB}" in the sheet.`);
  const rsvpMeta = find(RSVP_TAB) || (await createRsvpTab());
  // A tab made before a column was added to the log needs widening first.
  const narrow = HEADERS.length - (rsvpMeta.properties.gridProperties?.columnCount || HEADERS.length);
  if (narrow > 0) await sheets(":batchUpdate", { requests: [{ appendDimension: { sheetId: rsvpMeta.properties.sheetId, dimension: "COLUMNS", length: narrow } }] });
  const guestTab = tab(guestMeta.properties.title);
  const rsvpTab = tab(rsvpMeta.properties.title);

  const read = await sheets<{ valueRanges: { values?: Grid }[] }>(
    `/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&ranges=${encodeURIComponent(guestTab)}&ranges=${encodeURIComponent(`${rsvpTab}!A${FIRST_ROW}:${LAST_COL}`)}`,
  );
  const grid = read.valueRanges[0].values || [];
  const layout = parseGuestGrid(grid);
  if (!layout.headerRows.length) throw new SheetError(`Couldn't find a "Guest / Party Name" heading on the ${GUEST_TAB} tab.`);
  const { cols } = layout;
  if (cols.rsvp < 0 || cols.coming < 0 || cols.link < 0 || cols.replied < 0) await addGuestColumns(guestMeta, grid, layout);

  // Anyone already on the RSVPs tab has had their one automatic match attempt.
  const people = flattenPeople(await listRsvps());
  const changed = autoLink(layout.guests, people, seenKeys(read.valueRanges[1].values || []));
  const result = compute(layout.guests, people);

  // Guest rows sit in blocks (one per section); write each block of each column in one go.
  const blocks: number[][] = [];
  layout.guests.forEach((g, i) => {
    const last = blocks[blocks.length - 1];
    if (last && layout.guests[last[last.length - 1]].r === g.r - 1) last.push(i); else blocks.push([i]);
  });
  const data: { range: string; values: (string | number)[][] }[] = [];
  const column = (col: number, pick: (i: number) => string | number) => {
    for (const block of blocks) {
      const from = layout.guests[block[0]].r + 1;
      const to = layout.guests[block[block.length - 1]].r + 1;
      data.push({ range: `${guestTab}!${colLetter(col)}${from}:${colLetter(col)}${to}`, values: block.map((i) => [pick(i)]) });
    }
  };
  column(cols.rsvp, (i) => result.guests[i].status);
  column(cols.coming, (i) => result.guests[i].coming);
  column(cols.replied, (i) => when(result.guests[i].replied, false));
  for (const g of changed) data.push({ range: `${guestTab}!${colLetter(cols.link)}${g.r + 1}`, values: [[g.links.join(", ")]] });

  const s = result.summary;
  data.push(
    { range: `${rsvpTab}!A1:A2`, values: [["RSVPs from the website"], [`Last synced ${when(new Date().toISOString(), true)} · updates whenever someone replies`]] },
    { range: `${rsvpTab}!A4:G5`, values: [
      ["People replied", "Adults attending", "Children attending", "Declined", "Not matched to guest list", "Guests still to reply", "Need transport"],
      [s.replied, s.attending, s.kids, s.declined, s.unmatched, s.awaiting, s.transport],
    ] },
    { range: `${rsvpTab}!A${HEAD_ROW}:${LAST_COL}${HEAD_ROW}`, values: [HEADERS] },
  );
  if (result.people.length) {
    data.push({
      range: `${rsvpTab}!A${FIRST_ROW}:${LAST_COL}${FIRST_ROW + result.people.length - 1}`,
      values: result.people.map((p) => [when(p.date, true), p.name, p.attending ? "Yes" : "No", p.match, p.note,
        p.party.join(", "), p.adults, p.kids, p.replyId, p.date,
        p.transport === true ? "Yes" : p.transport === false ? "No" : ""]),
    });
  }
  await sheets("/values:batchClear", { ranges: [`${rsvpTab}!A${FIRST_ROW}:${LAST_COL}`] });
  // RAW: names and dates are stored exactly as written, never reinterpreted by Sheets.
  await sheets("/values:batchUpdate", { valueInputOption: "RAW", data });

  // Colours: status cells on the guest list, and unmatched people on the RSVPs tab.
  const paint = (hex: string | null) => (hex ? { userEnteredFormat: { backgroundColor: rgb(hex) } } : {});
  const requests: unknown[] = blocks.map((block) => ({
    updateCells: {
      range: {
        sheetId: guestMeta.properties.sheetId, startColumnIndex: cols.rsvp, endColumnIndex: cols.rsvp + 1,
        startRowIndex: layout.guests[block[0]].r, endRowIndex: layout.guests[block[block.length - 1]].r + 1,
      },
      rows: block.map((i) => {
        const status = result.guests[i].status;
        return { values: [paint(status ? FILL[status] || FLAG : null)] };
      }),
      fields: "userEnteredFormat.backgroundColor",
    },
  }));
  const matchCol = { sheetId: rsvpMeta.properties.sheetId, startColumnIndex: 3, endColumnIndex: 4, startRowIndex: FIRST_ROW - 1 };
  requests.push({ repeatCell: { range: matchCol, cell: {}, fields: "userEnteredFormat.backgroundColor" } });
  if (result.people.length) {
    requests.push({
      updateCells: {
        range: { ...matchCol, endRowIndex: FIRST_ROW - 1 + result.people.length },
        rows: result.people.map((p) => ({ values: [paint(!p.matched && !p.superseded ? FLAG : null)] })),
        fields: "userEnteredFormat.backgroundColor",
      },
    });
  }
  await sheets(":batchUpdate", { requests });

  // Housekeeping on the action list. A problem here must never fail the RSVP sync.
  await tidyPlanner(meta.sheets).catch((err) => console.error("Planner tidy failed", err));
  return s;
}

/**
 * Brings the sheet up to date. Safe to call from anywhere: it never throws, does nothing until the
 * sheet is connected, and if a sync is already running it asks that one to go round again.
 */
export async function syncSheet(): Promise<SheetSyncStatus | null> {
  if (!sheetConnection().configured) return null;
  try {
    if (!(await tryLock("sheet:lock", 60))) {
      await raiseFlag("sheet:again");
      return getSyncStatus();
    }
    let status: SheetSyncStatus;
    let rounds = 0;
    try {
      do {
        await takeFlag("sheet:again");
        try {
          const s = await runSync();
          status = {
            at: new Date().toISOString(), ok: true,
            message: `${s.replied} ${s.replied === 1 ? "person has" : "people have"} replied, ${s.unmatched} not matched to the guest list, ${s.awaiting} guests still to reply`,
          };
        } catch (err) {
          status = {
            at: new Date().toISOString(), ok: false,
            message: err instanceof SheetError ? err.message : "Something unexpected went wrong talking to Google Sheets.",
          };
          if (!(err instanceof SheetError)) console.error("Sheet sync failed", err);
        }
        await setSyncStatus(status);
      } while (++rounds < 3 && (await takeFlag("sheet:again")));
    } finally {
      await unlock("sheet:lock");
    }
    return status;
  } catch (err) {
    console.error("Sheet sync could not run", err);
    return null;
  }
}
