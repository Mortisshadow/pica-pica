import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export function AppError({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <Empty className="max-w-lg flex-none rounded-3xl border border-red-400/15 bg-red-400/[.055]">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-red-400/10 text-red-300"><AlertTriangle className="size-5" /></EmptyMedia>
          <EmptyTitle>Pica Pica could not start</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="secondary" onClick={() => window.location.reload()}>
          <RotateCcw className="size-4" /> Try again
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
