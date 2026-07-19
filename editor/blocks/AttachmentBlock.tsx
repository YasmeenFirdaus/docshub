import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import { FileIcon, ExternalLinkIcon, DownloadIcon, TrashIcon, LinkIcon } from 'lucide-react';
import React from 'react';

// Props matching our Attachment block design
export const AttachmentBlock = createReactBlockSpec(
  {
    type: 'attachment',
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      url: { default: '' },
      filename: { default: 'attachment' },
      original_filename: { default: '' },
      size: { default: 0 },
      mime: { default: 'application/octet-stream' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { url, filename, original_filename, size, mime } = props.block.props;
      const displayFilename = original_filename || filename;
      
      const tokenizedUrl = url;
      
      const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const handleDownload = (e: React.MouseEvent) => {
        e.preventDefault();
        const a = document.createElement('a');
        a.href = tokenizedUrl;
        a.download = displayFilename;
        a.click();
      };

      const handleCopyLink = (e: React.MouseEvent) => {
        e.preventDefault();
        // Assume url is absolute or relative, make it absolute for copying
        const absoluteUrl = new URL(tokenizedUrl, window.location.origin).href;
        navigator.clipboard.writeText(absoluteUrl);
      };

      // Determine preview type
      const isImage = mime.startsWith('image/');
      const isVideo = mime.startsWith('video/');
      const isPdf = mime === 'application/pdf';

      return (
        <div className="my-4 group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          {/* Actions Overlay - appears on hover */}
          <div className="absolute right-4 top-4 hidden gap-2 group-hover:flex">
            <button 
              onClick={() => window.open(tokenizedUrl, '_blank')} 
              className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
              title="Open in new tab"
            >
              <ExternalLinkIcon size={16} />
            </button>
            <button 
              onClick={handleDownload}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
              title="Download"
            >
              <DownloadIcon size={16} />
            </button>
            <button 
              onClick={handleCopyLink}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
              title="Copy Link"
            >
              <LinkIcon size={16} />
            </button>
            {/* Remove is handled by blocknote natively via drag handle or backspace, 
                but we could add a explicit remove button calling editor.removeBlocks([props.block]) if we pass editor down */}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileIcon size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{displayFilename}</span>
              <span className="text-xs text-muted-foreground">
                {formatSize(size)} • {mime.split('/')[1] || mime}
              </span>
            </div>
          </div>

          {/* Previews */}
          {isImage && (
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted">
              <img src={tokenizedUrl} alt={displayFilename} className="max-h-[400px] w-full object-contain" />
            </div>
          )}
          
          {isVideo && (
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted">
              <video src={tokenizedUrl} controls className="max-h-[400px] w-full" />
            </div>
          )}
          
          {isPdf && (
            <div className="mt-4 flex h-[300px] items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground flex-col gap-2">
               <FileIcon size={48} className="opacity-20" />
               <p className="text-sm">PDF Preview - <a href={tokenizedUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open to view</a></p>
            </div>
          )}
        </div>
      );
    },
  }
);
