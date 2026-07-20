import { BlockNoteEditor, PartialBlock, filterSuggestionItems } from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { MessageSquareWarning, Code2, Video, Sparkles, PencilLine, FileText, Wand2, SpellCheck2 } from "lucide-react";
import React from "react";

// Helper to insert a block
const insertCustomBlock = (editor: any, type: string, props = {}) => {
  editor.insertBlocks(
    [{ type, props } as PartialBlock],
    editor.getTextCursorPosition().block,
    "after"
  );
};

export const getCustomSlashMenuItems = (editor: any): DefaultReactSuggestionItem[] => [
  {
    title: "Callout",
    subtext: "Add a highlighted callout block",
    onItemClick: () => insertCustomBlock(editor, "callout"),
    icon: <MessageSquareWarning size={18} />,
    group: "Advanced",
  },
  {
    title: "Mermaid Diagram",
    subtext: "Render diagrams from text",
    onItemClick: () => insertCustomBlock(editor, "mermaid"),
    icon: <Code2 size={18} />,
    group: "Advanced",
  },
  {
    title: "Embed",
    subtext: "YouTube, Vimeo, Figma, Loom, Spotify",
    onItemClick: () => insertCustomBlock(editor, "embed"),
    icon: <Video size={18} />,
    group: "Advanced",
  },
];

export const getAiSlashMenuItems = (editor: any, onAiAction: (action: string) => void): DefaultReactSuggestionItem[] => [
  {
    title: "Ask AI",
    subtext: "Open the AI Assistant",
    onItemClick: () => onAiAction("ask"),
    icon: <Sparkles size={18} className="text-[#256D85]" />,
    group: "AI Actions",
  },
  {
    title: "Rewrite",
    subtext: "Rewrite the selected text",
    onItemClick: () => onAiAction("rewrite"),
    icon: <PencilLine size={18} className="text-[#256D85]" />,
    group: "AI Actions",
  },
  {
    title: "Summarize",
    subtext: "Summarize the document",
    onItemClick: () => onAiAction("summarize"),
    icon: <FileText size={18} className="text-[#256D85]" />,
    group: "AI Actions",
  },
  {
    title: "Continue Writing",
    subtext: "Let AI finish your thought",
    onItemClick: () => onAiAction("continue"),
    icon: <Wand2 size={18} className="text-[#256D85]" />,
    group: "AI Actions",
  },
  {
    title: "Fix Grammar",
    subtext: "Correct spelling and grammar",
    onItemClick: () => onAiAction("grammar"),
    icon: <SpellCheck2 size={18} className="text-[#256D85]" />,
    group: "AI Actions",
  },
];
