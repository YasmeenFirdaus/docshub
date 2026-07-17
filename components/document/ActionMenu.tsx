"use client";

import * as React from "react";
import { Archive, Copy, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DocumentActionMenu({
  documentId,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
  onRestore,
}: {
  documentId: string;
  onRename: () => void;
  onDuplicate?: (documentId: string) => Promise<void> | void;
  onArchive: (documentId: string) => Promise<void> | void;
  onDelete: (documentId: string) => Promise<void> | void;
  onRestore?: (documentId: string) => Promise<void> | void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full outline-none">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onRename} className="cursor-pointer">
          Rename
        </DropdownMenuItem>

        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(documentId)} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onArchive(documentId)} className="cursor-pointer text-amber-600 focus:text-amber-700">
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </DropdownMenuItem>

        {onRestore && (
          <DropdownMenuItem onClick={() => onRestore(documentId)} className="cursor-pointer">
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-700"
          onClick={() => onDelete(documentId)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Move to trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}