// Collapsible raw JSON block (used for Claude output and collected signals in the admin portal).
export default function JsonViewer({ title, data, open = false }) {
  if (data == null) return null;
  return (
    <details open={open} className="group rounded-lg border bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium hover:bg-secondary/60">
        {title}
      </summary>
      <pre className="max-h-[480px] overflow-auto border-t bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
