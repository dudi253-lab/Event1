export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Digi">
      <span className="brandMark">D</span>
      {!compact && <span>Digi</span>}
    </div>
  );
}
