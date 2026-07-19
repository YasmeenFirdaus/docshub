import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import React, { useState } from "react";

const getEmbedUrl = (url: string) => {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/);
  if (vimeoMatch) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };

  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-z0-9]+)/);
  if (loomMatch) return { provider: "loom", embedUrl: `https://www.loom.com/embed/${loomMatch[1]}` };

  // Figma
  if (url.includes("figma.com")) return { provider: "figma", embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}` };

  // Spotify
  const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) return { provider: "spotify", embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}` };

  return { provider: "unknown", embedUrl: url };
};

export const EmbedBlock = createReactBlockSpec(
  {
    type: "embed",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      url: {
        default: "",
      }
    },
    content: "none",
  },
  {
    render: (props) => {
      const [inputUrl, setInputUrl] = useState("");
      
      const handleEmbed = () => {
        if (inputUrl) {
          props.editor.updateBlock(props.block, {
            type: "embed",
            props: { url: inputUrl },
          });
        }
      };

      if (!props.block.props.url) {
        return (
          <div className="flex flex-col gap-2 p-4 my-2 border rounded-md bg-muted/20 w-full" contentEditable={false}>
            <div className="text-sm font-medium">Embed Content</div>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 px-3 py-1 text-sm border rounded-md"
                placeholder="Paste link to YouTube, Vimeo, Loom, Figma, or Spotify..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEmbed();
                }}
              />
              <button 
                onClick={handleEmbed}
                className="px-3 py-1 text-sm font-medium text-white bg-primary rounded-md"
              >
                Embed
              </button>
            </div>
          </div>
        );
      }

      const { embedUrl, provider } = getEmbedUrl(props.block.props.url);

      return (
        <div className="my-4 w-full" contentEditable={false}>
          <div className="relative w-full overflow-hidden rounded-md border" style={{ paddingTop: provider === 'spotify' ? '152px' : '56.25%' }}>
            <iframe
              src={embedUrl}
              className="absolute top-0 left-0 w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              style={{ border: 0 }}
            />
          </div>
        </div>
      );
    },
  }
);
