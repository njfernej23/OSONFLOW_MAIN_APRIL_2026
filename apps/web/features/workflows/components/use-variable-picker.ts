"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  buildVariableToken,
  type WorkflowVariable,
} from "../lib/variable-tokens"

/**
 * The "{" variable picker shared by the message editor and the single-line
 * variable inputs.
 */
export const useVariablePicker = ({
  shellRef,
  editorRef,
  variables,
  onInserted,
}: {
  shellRef: React.RefObject<HTMLDivElement | null>
  editorRef: React.RefObject<HTMLDivElement | null>
  variables: WorkflowVariable[]
  onInserted: (editor: HTMLDivElement) => void
}) => {
  const [picker, setPicker] = useState<{
    query: string
    top: number
    left: number
  } | null>(null)
  /**
   * Where the "{query" sits. Captured when the picker opens: by the time the
   * author clicks a row the live selection has moved to the button.
   */
  const anchorRef = useRef<{ node: Text; end: number; length: number } | null>(
    null
  )

  const readQuery = () => {
    const selection = window.getSelection()
    const node = selection?.focusNode

    if (!selection || !node || node.nodeType !== Node.TEXT_NODE) {
      return null
    }

    const before = (node.textContent ?? "").slice(0, selection.focusOffset)
    const match = /\{([\w.-]*)$/.exec(before)

    return match ? { query: match[1] ?? "", length: match[0].length } : null
  }

  const refresh = useCallback(() => {
    const editor = editorRef.current
    const found = readQuery()

    if (!editor || !found) {
      anchorRef.current = null
      setPicker(null)
      return
    }

    const selection = window.getSelection()

    if (selection?.focusNode) {
      anchorRef.current = {
        node: selection.focusNode as Text,
        end: selection.focusOffset,
        length: found.length,
      }
    }

    const range = selection?.getRangeAt(0).cloneRange()
    const rect = range?.getClientRects()[0] ?? range?.getBoundingClientRect()
    const host = editor.getBoundingClientRect()

    setPicker({
      query: found.query,
      top: (rect ? rect.bottom - host.top : 20) + 6,
      left: Math.max(0, (rect ? rect.left - host.left : 0) - 8),
    })
  }, [editorRef])

  const insert = useCallback(
    (name: string) => {
      const editor = editorRef.current
      const anchor = anchorRef.current

      if (!editor || !anchor || !editor.contains(anchor.node)) {
        return
      }

      // Swallow the "{query" the author typed, then drop the pill in.
      const range = document.createRange()
      range.setStart(anchor.node, Math.max(0, anchor.end - anchor.length))
      range.setEnd(anchor.node, anchor.end)
      range.deleteContents()

      const fragment = range.createContextualFragment(
        `${buildVariableToken(name, variables)}&nbsp;`
      )
      const lastNode = fragment.lastChild
      range.insertNode(fragment)
      editor.focus()

      const selection = window.getSelection()

      if (selection && lastNode) {
        const caret = document.createRange()
        caret.setStartAfter(lastNode)
        caret.collapse(true)
        selection.removeAllRanges()
        selection.addRange(caret)
      }

      anchorRef.current = null
      setPicker(null)
      onInserted(editor)
    },
    [editorRef, onInserted, variables]
  )

  const matches = picker
    ? variables.filter((entry) =>
        entry.name.toLowerCase().includes(picker.query.toLowerCase())
      )
    : []

  useEffect(() => {
    if (!picker) {
      return
    }

    const close = (event: MouseEvent) => {
      // Test the shell, not the editor: the picker is a sibling of the editor,
      // so testing the editor closed it before the click could land.
      if (!shellRef.current?.contains(event.target as Node)) {
        setPicker(null)
      }
    }

    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [picker, shellRef])

  return { picker, matches, refresh, insert, close: () => setPicker(null) }
}
