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

  const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

  return {
    x: round(left),
    y: round(top),
    width: round(right - left),
    height: round(bottom - top),
  };
}

/**
 * Transform a PDF text item's rectangle through the PDF.js viewport matrix.
 * Transforming all four corners preserves bounds on rotated pages.
 */
export function normalizePdfTextItemBounds(
  x: number, baselineY: number, width: number, height: number,
  transform: readonly number[],
  viewportWidth: number, viewportHeight: number,
): NormalizedRect | null {
  if (transform.length !== 6 || ![x, baselineY, width, height, ...transform].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const [a, b, c, d, e, f] = transform as [number, number, number, number, number, number];
  const corners = [[x, baselineY - height], [x + width, baselineY - height], [x, baselineY], [x + width, baselineY]]
    .map(([px, py]) => [a * px + c * py + e, b * px + d * py + f]);
  const rect: [number, number, number, number] = [
    Math.min(...corners.map((point) => point[0])), Math.min(...corners.map((point) => point[1])),
    Math.max(...corners.map((point) => point[0])), Math.max(...corners.map((point) => point[1])),
  ];
  return normalizeViewportRect(rect, viewportWidth, viewportHeight);
}
/**
 * Groups PDF.js text fragments into visual rows using their baseline positions.
 * Source fragments and their normalized boxes are retained for page highlighting.
 * This is approximate row reconstruction, not general table understanding.
 */
export function groupPositionedText(items: PositionedTextItem[], yTolerance = 2.5): TextLine[] {
  const sorted = items
    .filter((item) => item.text.trim().length > 0 && Number.isFinite(item.x) && Number.isFinite(item.y))
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x);
  type Row = { anchorY: number; baselines: number[]; items: PositionedTextItem[] };
  const rows: Row[] = [];
  for (const item of sorted) {
    const itemHeight = Number.isFinite(item.height) && (item.height ?? 0) > 0 ? item.height! : null;
    let nearest: Row | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const heights = row.items.map((entry) => entry.height).filter((height): height is number => Number.isFinite(height) && (height ?? 0) > 0);
      const rowHeight = heights.length ? Math.min(...heights) : null;
      const scaled = itemHeight !== null && rowHeight !== null ? Math.min(6, Math.min(itemHeight, rowHeight) * 0.35) : yTolerance;
      const distance = Math.abs(row.anchorY - item.y);
      if (distance <= Math.max(yTolerance, scaled) && distance < nearestDistance) { nearest = row; nearestDistance = distance; }
    }
    if (nearest) {
      nearest.items.push(item);
      nearest.baselines.push(item.y);
      const values = [...nearest.baselines].sort((a, b) => a - b);
      const middle = Math.floor(values.length / 2);
      nearest.anchorY = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    } else { rows.push({ anchorY: item.y, baselines: [item.y], items: [item] }); }
  }
  return rows.sort((a, b) => b.anchorY - a.anchorY).map((row) => {
    const fragments = row.items.slice().sort((a, b) => a.x - b.x);
    return { y: row.anchorY, fragments, text: fragments.map((item) => item.text.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim() };
  }).filter((row) => row.text.length > 0);
}
