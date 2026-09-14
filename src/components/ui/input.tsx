import * as React from "react";

import { cn } from "@/lib/utils";
import { evaluateMathExpression, isMathExpression } from "@/lib/mathExpression";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onBlur, onKeyDown, inputMode, autoComplete, ...props }, ref) => {
    const isNumeric = type === "number";

    const resolveExpression = (
      event: React.SyntheticEvent<HTMLInputElement>,
    ) => {
      const el = event.currentTarget;
      if (!el || el.readOnly || el.disabled) return;
      const current = el.value ?? "";
      if (!isMathExpression(current)) return;
      const result = evaluateMathExpression(current);
      if (result === null) return;
      el.value = String(result);
      // Notifica al consumidor con el valor ya calculado
      props.onChange?.({
        ...(event as unknown as React.ChangeEvent<HTMLInputElement>),
        target: el,
        currentTarget: el,
      } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <input
        // Los campos numéricos aceptan operaciones (2*3+10) y se calculan al salir o con Enter
        type={isNumeric ? "text" : type}
        inputMode={isNumeric ? "decimal" : inputMode}
        autoComplete={autoComplete ?? (isNumeric ? "off" : undefined)}
        onBlur={(event) => {
          if (isNumeric) resolveExpression(event);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (isNumeric && event.key === "Enter") resolveExpression(event);
          onKeyDown?.(event);
        }}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
