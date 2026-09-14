import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

function childText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(childText).join("");
  if (React.isValidElement(node)) return childText((node.props as any)?.children);
  return "";
}

function collectOptions(children: React.ReactNode, acc: Option[] = []): Option[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as any;
    if (child.type === "option") {
      acc.push({
        value: String(props.value ?? ""),
        label: childText(props.children) || String(props.value ?? ""),
        disabled: !!props.disabled,
      });
      return;
    }
    if (props?.children) collectOptions(props.children, acc);
  });
  return acc;
}

export interface SearchSelectProps {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  options?: Option[];
  className?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Muestra el buscador a partir de esta cantidad de opciones */
  searchThreshold?: number;
}

/**
 * Desplegable con búsqueda rápida. Acepta los mismos hijos `<option>` que un
 * `<select>` nativo, por lo que sustituye directamente a los selects nativos.
 */
export const SearchSelect = React.forwardRef<HTMLButtonElement, SearchSelectProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      children,
      options,
      className,
      id,
      disabled,
      placeholder = "Seleccionar…",
      searchPlaceholder = "Buscar…",
      emptyMessage = "Sin resultados.",
      searchThreshold = 6,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const items = React.useMemo(() => options ?? collectOptions(children), [options, children]);
    const selected = items.find((o) => o.value === (value ?? ""));
    const showSearch = items.length >= searchThreshold;

    const emit = (next: string) => {
      onValueChange?.(next);
      onChange?.({ target: { value: next } });
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal hover:bg-background hover:text-foreground",
              className,
            )}
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[12rem] p-0" align="start">
          <Command>
            {showSearch && <CommandInput placeholder={searchPlaceholder} />}
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {items.map((option, index) => (
                  <CommandItem
                    key={`${option.value}-${index}`}
                    value={`${option.label} ${option.value}`}
                    disabled={option.disabled}
                    onSelect={() => {
                      emit(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        option.value === (value ?? "") ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
SearchSelect.displayName = "SearchSelect";
