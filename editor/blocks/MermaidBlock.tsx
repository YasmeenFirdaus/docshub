import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import React, { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";
import { v4 as uuidv4 } from "uuid";
import { Code2, Play } from "lucide-react";

mermaid.initialize({ startOnLoad: false, theme: 'default' });

export const MermaidBlock = createReactBlockSpec(
  {
    type: "mermaid",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      code: {
        default: "graph TD;\n    A-->B;\n    A-->C;\n    B-->D;\n    C-->D;",
      }
    },
    content: "none",
  },
  {
    render: (props) => {
      const [isEditing, setIsEditing] = useState(!props.block.props.code || props.block.props.code === "graph TD;\n    A-->B;\n    A-->C;\n    B-->D;\n    C-->D;");
      const [svgContent, setSvgContent] = useState<string>("");
      const [error, setError] = useState<string | null>(null);
      const [localCode, setLocalCode] = useState(props.block.props.code);
      const containerRef = useRef<HTMLDivElement>(null);
      const idRef = useRef(`mermaid-${uuidv4().replace(/-/g, '')}`);

      useEffect(() => {
        setLocalCode(props.block.props.code);
      }, [props.block.props.code]);

      useEffect(() => {
        if (isEditing) return;
        
        let isMounted = true;
        const renderDiagram = async () => {
          try {
            setError(null);
            if (!localCode.trim()) {
              setSvgContent("");
              return;
            }
            
            // Clear previous to prevent mermaid duplicate ID errors
            if (containerRef.current) {
              containerRef.current.innerHTML = '';
            }

            const { svg } = await mermaid.render(idRef.current, localCode);
            if (isMounted) setSvgContent(svg);
          } catch (err: any) {
            if (isMounted) {
              setError(err.message || "Failed to render diagram");
              console.error(err);
            }
          }
        };

        renderDiagram();
        
        return () => {
          isMounted = false;
        };
      }, [localCode, isEditing]);

      const toggleEditing = () => {
        if (isEditing) {
          // Save to block state when done editing
          props.editor.updateBlock(props.block, {
            type: "mermaid",
            props: { code: localCode },
          });
        }
        setIsEditing(!isEditing);
      };

      return (
        <div className="w-full my-4 border rounded-md group relative bg-background" contentEditable={false}>
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={toggleEditing}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm hover:bg-secondary/80"
            >
              {isEditing ? <Play className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
              {isEditing ? "Render" : "Edit Code"}
            </button>
          </div>

          {isEditing ? (
            <div className="p-4">
              <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mermaid Code</div>
              <textarea
                value={localCode}
                onChange={(e) => setLocalCode(e.target.value)}
                className="w-full h-48 p-3 font-mono text-sm border rounded bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                placeholder="graph TD;\n  A-->B;"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    toggleEditing();
                  }
                }}
              />
            </div>
          ) : (
            <div className="p-4 flex items-center justify-center min-h-[100px] overflow-auto bg-muted/10">
              {error ? (
                <div className="text-sm text-destructive whitespace-pre-wrap font-mono p-4 bg-destructive/10 rounded">
                  {error}
                </div>
              ) : svgContent ? (
                <div 
                  ref={containerRef}
                  dangerouslySetInnerHTML={{ __html: svgContent }} 
                  className="max-w-full"
                />
              ) : (
                <div className="text-sm text-muted-foreground">Empty diagram</div>
              )}
            </div>
          )}
        </div>
      );
    },
  }
);
