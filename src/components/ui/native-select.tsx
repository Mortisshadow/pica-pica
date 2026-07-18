import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, size = "default", ...props }: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  return (
    <div className="group/native-select relative w-full has-[select:disabled]:opacity-50" data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-xl border bg-muted/55 px-3.5 py-2 pr-9 text-sm text-foreground outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-9 data-[size=sm]:py-1",
          "focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      />
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 select-none text-muted-foreground opacity-50" aria-hidden="true" data-slot="native-select-icon" />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={cn("bg-[Canvas] text-[CanvasText]", className)} {...props} />;
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" className={cn("bg-[Canvas] text-[CanvasText]", className)} {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
