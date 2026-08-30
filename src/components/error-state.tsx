"use client";

import { Button } from "@/components/ui/button";

export function ErrorState({
  message = "Erro ao carregar",
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      role="alert"
    >
      <p className="text-sm text-destructive">{message}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  message = "Nenhum item encontrado",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-2">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
