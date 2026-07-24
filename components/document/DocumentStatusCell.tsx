"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { DocumentStatus } from "./types";

type UIStatus = "DRAFT" | "PUBLISHED_EDIT" | "PUBLISHED_VIEW" | "PRIVATE";

const STATUS_OPTIONS: { value: UIStatus; label: string; className: string; status: DocumentStatus; workspaceEdit: boolean }[] = [
  { value: "DRAFT", label: "Draft", className: "bg-slate-100 text-slate-700 hover:bg-slate-200", status: "DRAFT", workspaceEdit: false },
  { value: "PUBLISHED_EDIT", label: "Published (Can Edit)", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200", status: "PUBLISHED", workspaceEdit: true },
  { value: "PUBLISHED_VIEW", label: "Published (View Only)", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200", status: "PUBLISHED", workspaceEdit: false },
  { value: "PRIVATE", label: "Private", className: "bg-violet-100 text-violet-700 hover:bg-violet-200", status: "PRIVATE", workspaceEdit: false },
];

export function DocumentStatusCell({
  documentId,
  status,
  workspaceEdit,
  onChange,
  disabled,
}: {
  documentId: string;
  status: DocumentStatus;
  workspaceEdit: boolean;
  onChange?: (documentId: string, nextStatus: DocumentStatus, nextWorkspaceEdit: boolean) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState<DocumentStatus>(status);
  const [currentEdit, setCurrentEdit] = React.useState<boolean>(workspaceEdit);

  React.useEffect(() => {
    setCurrentStatus(status);
    setCurrentEdit(workspaceEdit);
  }, [status, workspaceEdit]);

  const currentOption =
    STATUS_OPTIONS.find((item) => item.status === currentStatus && (currentStatus !== "PUBLISHED" || item.workspaceEdit === currentEdit)) ?? STATUS_OPTIONS[0];

  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        disabled
        className={cn("h-8 gap-1.5 rounded-full px-3 text-xs font-medium opacity-70", currentOption.className)}
      >
        {currentOption.label}
      </Button>
    );
  }

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

      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup heading="Status & Permissions">
              {STATUS_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={async () => {
                    if (option.status === currentStatus && option.workspaceEdit === currentEdit) {
                      setOpen(false);
                      return;
                    }

                    const prevStatus = currentStatus;
                    const prevEdit = currentEdit;
                    
                    setCurrentStatus(option.status);
                    setCurrentEdit(option.workspaceEdit);
                    setOpen(false);

                    try {
                      if (onChange) {
                        await Promise.resolve(onChange(documentId, option.status, option.workspaceEdit));
                      }
                    } catch {
                      setCurrentStatus(prevStatus);
                      setCurrentEdit(prevEdit);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentStatus === option.status && currentEdit === option.workspaceEdit ? "opacity-100" : "opacity-0",
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