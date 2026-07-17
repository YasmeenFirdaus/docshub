import { DefaultReactSuggestionItem, getDefaultReactSlashMenuItems } from "@blocknote/react"
import { Sparkles } from "lucide-react"

const insertAIBlockItem = (editor: any): DefaultReactSuggestionItem => ({
  title: "Ask AI",
  onItemClick: () => {
    const currentBlock = editor.getTextCursorPosition().block
    editor.updateBlock(currentBlock, { type: "paragraph", content: "✨ AI is generating..." })
  },
  aliases: ["ai", "magic", "generate"],
  group: "Advanced",
  icon: <Sparkles size={18} className="text-indigo-600" />,
  subtext: "Generate content with AI",
})

export const getCustomSlashMenuItems = (editor: any): DefaultReactSuggestionItem[] => {
  // Get all the standard formatting commands (Headings, Lists, etc.)
  const defaultItems = getDefaultReactSlashMenuItems(editor)
  // Inject our custom AI tool at the top
  return [insertAIBlockItem(editor), ...defaultItems]
}