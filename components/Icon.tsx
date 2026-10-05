export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-icon ${className}`}>{name}</span>;
}
