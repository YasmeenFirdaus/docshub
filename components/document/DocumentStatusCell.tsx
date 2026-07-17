"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { DocumentStatus } from "./types";

const STATUS_OPTIONS: { value: DocumentStatus; label: string; className: string }[] = [
  { value: "DRAFT", label: "Draft", className: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
  { value: "PUBLISHED", label: "Published", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  { value: "PRIVATE", label: "Private", className: "bg-violet-100 text-violet-700 hover:bg-violet-200" },
];

export function DocumentStatusCell({
  documentId,
  status,
  onChange,
}: {
  documentId: string;
  status: DocumentStatus;
  onChange: (documentId: string, nextStatus: DocumentStatus) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<DocumentStatus>(status);

  React.useEffect(() => {
    setCurrent(status);
  }, [status]);

  const currentOption =
    STATUS_OPTIONS.find((item) => item.value === current) ?? STATUS_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn("h-8 gap-1.5 rounded-full px-3 text-xs font-medium", currentOption.className)}
        >
          {currentOption.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-44 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup heading="Status">
              {STATUS_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={async () => {
                    if (option.value === current) {
                      setOpen(false);
                      return;
                    }

                    const previous = current;
                    setCurrent(option.value);
                    setOpen(false);

                    try {
                      await Promise.resolve(onChange(documentId, option.value));
                    } catch {
                      setCurrent(previous);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      current === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}