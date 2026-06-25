export function EvidenceList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-xs text-slate-600">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-1.5">
          <span className="text-green-500">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
