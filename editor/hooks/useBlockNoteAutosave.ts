import { useState, useEffect, useRef } from "react"
import { useDebounce } from "use-debounce"

export function useBlockNoteAutosave(documentId: string, initialTitle: string) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState<any>(null)
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Error'>('Saved')
  const [permissionError, setPermissionError] = useState(false)
  
  const [debouncedTitle] = useDebounce(title, 1000)
  const [debouncedContent] = useDebounce(content, 1000)
  
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Prevent saving on the initial render mount
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const saveDocument = async () => {
      setSaveStatus('Saving...')
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: debouncedTitle, 
            content: debouncedContent 
          })
        })

        if (!res.ok) {
          if (res.status === 403) {
            setPermissionError(true)
          }
          throw new Error("Failed to save")
        }
        setSaveStatus('Saved')
      } catch (error) {
        console.error(error)
        setSaveStatus('Error')
      }
    }

    if (debouncedContent || debouncedTitle !== initialTitle) {
      saveDocument()
    }
  }, [debouncedContent, debouncedTitle, documentId, initialTitle])

  return { title, setTitle, setContent, saveStatus, permissionError, setPermissionError }
}