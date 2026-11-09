import type { ExportFormat } from "@smartpathy/shared";

const FORMAT_ICONS: Record<ExportFormat, { color: string; glyph: string; fontSize: number }> = {
  pdf: { color: "#dc2626", glyph: "PDF", fontSize: 10 },
  json: { color: "#8b5cf6", glyph: "{ }", fontSize: 13 },
  docx: { color: "#2563eb", glyph: "W", fontSize: 16 },
  xlsx: { color: "#16a34a", glyph: "X", fontSize: 16 },
};

/** A document shape in the color of the format, as in Figure 31. */
export function FormatIcon({ format, className }: { format: ExportFormat; className?: string }) {
  const { color, glyph, fontSize } = FORMAT_ICONS[format];

  return (
    <svg aria-hidden="true" viewBox="0 0 40 48" className={className}>
      <path d="M6 1h20l13 13v29a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4Z" fill={color} />
      <path d="M26 1l13 13H30a4 4 0 0 1-4-4V1Z" fill="#fff" fillOpacity={0.45} />
      <text
        x="20"
        y="34"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={700}
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#fff"
      >
        {glyph}
      </text>
    </svg>
  );
}
