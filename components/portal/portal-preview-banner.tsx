export function PortalPreviewBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="shrink-0 border-b border-warning/30 bg-warning/10 px-6 py-2 text-sm text-foreground"
    >
      {children}
    </div>
  );
}
