"use client";

import * as React from "react";
import { Check, ChevronDown, Plus, Search, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

import type { Person } from "./types";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type Mode = "contributors" | "reviewers";

export function DocumentPeopleCell({
  documentId,
  mode,
  people,
  selectablePeople,
  onUpdateContributors,
  onAddReviewer,
}: {
  documentId: string;
  mode: Mode;
  people: Person[];
  selectablePeople: Person[];
  onUpdateContributors?: (documentId: string, userIds: string[]) => Promise<void> | void;
  onAddReviewer?: (documentId: string, reviewerId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>(people.map((person) => person.id));
  const [singleReviewerId, setSingleReviewerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedIds(people.map((person) => person.id));
  }, [people]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectablePeople;

    return selectablePeople.filter((person) => {
      return (
        person.name.toLowerCase().includes(q) ||
        person.email.toLowerCase().includes(q)
      );
    });
  }, [query, selectablePeople]);

  const label = mode === "contributors" ? "Contributors" : "Reviewers";
  const triggerLabel =
    people.length > 0
      ? people.length === 1
        ? people[0].name
        : `${people.length} ${mode}`
      : `Add ${mode}`;

  if (mode === "reviewers") {
    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" className="h-8 gap-1 rounded-md px-2 text-sm">
              <UserPlus className="h-4 w-4" />
              <span className="truncate">{triggerLabel}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search reviewer..." value={query} onValueChange={setQuery} />
              <CommandList>
                <CommandEmpty>No user found.</CommandEmpty>
                <CommandGroup heading={label}>
                  {filtered.map((person) => (
                    <CommandItem
                      key={person.id}
                      value={`${person.name} ${person.email}`}
                      onSelect={async () => {
                        const previous = singleReviewerId;
                        setSingleReviewerId(person.id);
                        setOpen(false);

                        try {
                          if (!onAddReviewer) return;
                          await Promise.resolve(onAddReviewer(documentId, person.id));
                        } catch {
                          setSingleReviewerId(previous);
                        }
                      }}
                    >
                      <Avatar className="mr-2 h-6 w-6">
                        <AvatarImage src={person.avatar_url ?? undefined} alt={person.name} />
                        <AvatarFallback className="text-[10px]">{initials(person.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{person.name}</div>
                        <div className="truncate text-xs text-slate-500">{person.email}</div>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          singleReviewerId === person.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <span className="text-xs text-slate-500">
          {people.length > 0 ? `${people.length} reviewer${people.length > 1 ? "s" : ""}` : "None"}
        </span>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        className="h-8 gap-1 rounded-md px-2 text-sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        <span className="truncate">{triggerLabel}</span>
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage contributors</DialogTitle>
          <DialogDescription>
            Add workspace members as contributors for this document.
          </DialogDescription>
        </DialogHeader>

        <Command className="rounded-lg border">
          <CommandInput placeholder="Search contributor..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup heading={label}>
              {filtered.map((person) => {
                const checked = selectedIds.includes(person.id);

                return (
                  <CommandItem
                    key={person.id}
                    value={`${person.name} ${person.email}`}
                    onSelect={() => {
                      setSelectedIds((current) =>
                        current.includes(person.id)
                          ? current.filter((id) => id !== person.id)
                          : [...current, person.id],
                      );
                    }}
                  >
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarImage src={person.avatar_url ?? undefined} alt={person.name} />
                      <AvatarFallback className="text-[10px]">{initials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{person.name}</div>
                      <div className="truncate text-xs text-slate-500">{person.email}</div>
                    </div>
                    <Check className={cn("ml-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {selectedIds.length} selected
          </div>
          <Button
            type="button"
            onClick={async () => {
              if (!onUpdateContributors) {
                setOpen(false);
                return;
              }

              const previous = people.map((person) => person.id);

              try {
                await Promise.resolve(onUpdateContributors(documentId, selectedIds));
                setOpen(false);
              } catch {
                setSelectedIds(previous);
              }
            }}
          >
            Save contributors
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}