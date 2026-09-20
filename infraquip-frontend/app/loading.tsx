import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
        <Loader2 className="absolute h-5 w-5 text-amber-500 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Loading InfraQuip...
      </p>
    </div>
  );
}
