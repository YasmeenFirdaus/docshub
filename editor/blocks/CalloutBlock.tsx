import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import React from "react";

export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      backgroundColor: {
        default: "blue",
        values: ["gray", "blue", "green", "yellow", "red", "purple"],
      },
      icon: {
        default: "💡",
      }
    },
    content: "inline",
  },
  {
    render: (props) => {
      const bgColor = props.block.props.backgroundColor;
      // Map to tailwind colors
      const bgClass = {
        gray: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700",
        blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800",
        green: "bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800",
        yellow: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800",
        red: "bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800",
        purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800",
      }[bgColor] || "bg-gray-100";

      return (
        <div className={`flex items-start p-4 my-2 rounded-md border ${bgClass} w-full`}>
          <div className="mr-3 text-xl leading-none select-none" contentEditable={false}>
            {props.block.props.icon}
          </div>
          <div className="flex-1 min-w-0" ref={props.contentRef} />
        </div>
      );
    },
  }
);
