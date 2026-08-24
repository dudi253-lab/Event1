export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Moments">
      <span className="brandMark">M</span>
      {!compact && <span>Moments</span>}
    </div>
  );
}
