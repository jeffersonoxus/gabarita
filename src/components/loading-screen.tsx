export function LoadingScreen({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Carregando">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
