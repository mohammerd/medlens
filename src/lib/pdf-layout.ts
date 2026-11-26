export interface PositionedTextItem {
  text: string;
  x: number;
  y: number;
}

export interface TextLine {
  text: string;
  y: number;
}

/**
 * Groups PDF.js text fragments into visual rows using their baseline positions.
 * This improves table reading compared with joining every page fragment into
 * one long string. It does not reconstruct columns or perform OCR.
 */
export function groupPositionedText(
  items: PositionedTextItem[],
  yTolerance = 2.5,
): TextLine[] {
  const sorted = items
    .filter((item) => item.text.trim().length > 0 && Number.isFinite(item.x) && Number.isFinite(item.y))
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: { y: number; items: PositionedTextItem[] }[] = [];

  for (const item of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= yTolerance);
    if (row) {
      row.items.push(item);
      row.y = row.items.reduce((sum, current) => sum + current.y, 0) / row.items.length;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => ({
      y: row.y,
      text: row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((row) => row.text.length > 0);
}
