"use client";

import * as React from "react";

import { DocumentRowData, Person, WorkspaceNode } from "./types";
import { DocTableRow } from "./DocTableRow";

export function DocTable({
  rows,
  workspaces,
  members,
  onRefresh,
}: {
  rows: DocumentRowData[];
  workspaces: WorkspaceNode[];
  members: Person[];
  onRefresh: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full border-collapse">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Contributors</th>
            <th className="px-4 py-3">Reviewers</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>

        <tbody>
          {rows.map((doc) => (
            <DocTableRow
              key={doc.id}
              doc={doc}
              workspaces={workspaces}
              members={members}
              onRefresh={onRefresh}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}