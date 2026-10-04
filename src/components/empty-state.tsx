export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-xl bg-surface px-4 py-9 text-center text-muted-foreground">
      <p className="mb-1 text-lg font-semibold text-foreground">{title}</p>
      <p className="text-balance">{body}</p>
    </div>
  );
}
