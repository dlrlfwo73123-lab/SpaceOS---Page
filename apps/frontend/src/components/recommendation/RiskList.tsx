export function RiskList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-xs text-amber-700">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-1.5">
          <span>⚠</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
