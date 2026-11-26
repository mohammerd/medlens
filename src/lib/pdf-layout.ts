export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedTextItem {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  bounds?: NormalizedRect | null;
}

export interface TextLine {
  text: string;
  y: number;
  fragments: PositionedTextItem[];
}

/**
 * Convert a PDF.js viewport rectangle into 0..1 page coordinates.
 * Returns null for invalid or fully out-of-page rectangles.
 */
export function normalizeViewportRect(
  rect: [number, number, number, number],
  viewportWidth: number,
  viewportHeight: number,
): NormalizedRect | null {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    rect.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }

  const left = Math.max(0, Math.min(1, Math.min(rect[0], rect[2]) / viewportWidth));
  const top = Math.max(0, Math.min(1, Math.min(rect[1], rect[3]) / viewportHeight));
  const right = Math.max(0, Math.min(1, Math.max(rect[0], rect[2]) / viewportWidth));
  const bottom = Math.max(0, Math.min(1, Math.max(rect[1], rect[3]) / viewportHeight));

  if (right <= left || bottom <= top) return null;

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Groups PDF.js text fragments into visual rows using their baseline positions.
 * Source fragments and their normalized boxes are retained for page highlighting.
 * This is approximate row reconstruction, not general table understanding.
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
    .map((row) => {
      const fragments = row.items.sort((a, b) => a.x - b.x);
      return {
        y: row.y,
        fragments,
        text: fragments
          .map((item) => item.text.trim())
          .filter(Boolean)
          .join(" ")
          .replace(/\\s+/g, " ")
          .trim(),
      };
    })
    .filter((row) => row.text.length > 0);
}
