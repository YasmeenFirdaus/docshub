export function markdownToHtml(md: string): string {
  // Escape HTML tags to prevent breaking editor structure
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Italics: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Split into lines to parse paragraphs and bullet points
  const lines = html.split('\n')
  const processedLines = lines.map(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return `<li style="margin-bottom: 4px;">${trimmed.slice(2)}</li>`
    }
    return trimmed ? `<p>${trimmed}</p>` : '<p>&nbsp;</p>'
  })

  // Group consecutive <li> items into <ul>
  let finalHtml = ''
  let inList = false
  for (const line of processedLines) {
    if (line.startsWith('<li')) {
      if (!inList) {
        finalHtml += '<ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 8px;">'
        inList = true
      }
      finalHtml += line
    } else {
      if (inList) {
        finalHtml += '</ul>'
        inList = false
      }
      finalHtml += line
    }
  }
  if (inList) {
    finalHtml += '</ul>'
  }

  return finalHtml
}
