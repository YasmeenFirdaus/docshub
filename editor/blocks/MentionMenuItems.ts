
import { DefaultReactSuggestionItem } from "@blocknote/react";

export const getMentionMenuItems = async (
  query: string,
  editor: any
): Promise<DefaultReactSuggestionItem[]> => {
  try {
    const res = await fetch(`/api/search/mentions?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const { people, pages, dates } = data;

    const items: DefaultReactSuggestionItem[] = [];

    if (people && people.length > 0) {
      people.forEach((person: any) => {
        items.push({
          title: person.name,
          subtext: "Person",
          group: "People",
          onItemClick: () => {
            editor.insertInlineContent([
              {
                type: "text",
                text: `@${person.name}`,
                styles: { textColor: "blue", bold: true },
              },
              { type: "text", text: " ", styles: {} },
            ]);
          },
        });
      });
    }

    if (pages && pages.length > 0) {
      pages.forEach((page: any) => {
        items.push({
          title: page.title,
          subtext: "Document",
          group: "Pages",
          onItemClick: () => {
            editor.insertInlineContent([
              {
                type: "text",
                text: `@@${page.title}`, // Just double @ or some indicator
                styles: { textColor: "purple", underline: true },
              },
              { type: "text", text: " ", styles: {} },
            ]);
          },
        });
      });
    }

    if (dates && dates.length > 0) {
      dates.forEach((date: any) => {
        items.push({
          title: date.label,
          subtext: "Date",
          group: "Dates",
          onItemClick: () => {
            editor.insertInlineContent([
              {
                type: "text",
                text: `@${date.label}`,
                styles: { textColor: "gray", italic: true },
              },
              { type: "text", text: " ", styles: {} },
            ]);
          },
        });
      });
    }

    return items;
  } catch (err) {
    console.error("Failed to fetch mentions:", err);
    return [];
  }
};
