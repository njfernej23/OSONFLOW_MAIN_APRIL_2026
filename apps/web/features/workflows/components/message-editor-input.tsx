"use client"

import { useCallback, useLayoutEffect, useRef, type FormEvent } from "react"

import { tokenizeVariables, type WorkflowVariable } from "../lib/variable-tokens"
import { useVariablePicker } from "./use-variable-picker"
import { VariablePickerList } from "./variable-picker-list"

type MessageEditorInputProps = {
  nodeId: string
  value: string
  placeholder: string
  ariaLabel: string
  onSync: (nodeId: string, html: string) => void
  variables?: WorkflowVariable[]
}

/**
 * Rich text field for message-like content.
 *
 * {{variables}} render as pills. They are re-tokenised on blur rather than on
 * every keystroke, because rewriting innerHTML mid-typing would throw the
 * caret back to the start of the field.
 */
export const MessageEditorInput = ({
  nodeId,
  value,
  placeholder,
  ariaLabel,
  onSync,
  variables = [],
}: MessageEditorInputProps) => {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const previousNodeIdRef = useRef(nodeId)

  const emit = useCallback(
    (editor: HTMLDivElement) => {
      const isEmpty = editor.textContent?.trim().length === 0
      onSync(nodeId, isEmpty ? "" : editor.innerHTML)
    },
    [nodeId, onSync]
  )

  const { picker, matches, refresh, insert, close } = useVariablePicker({
    shellRef,
    editorRef,
    variables,
    onInserted: emit,
  })

  useLayoutEffect(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const nextHtml = tokenizeVariables(value || "", variables)
    const nodeChanged = previousNodeIdRef.current !== nodeId
    const editorFocused = document.activeElement === editor

    if (nodeChanged || (!editorFocused && editor.innerHTML !== nextHtml)) {
      editor.innerHTML = nextHtml
    }

    previousNodeIdRef.current = nodeId
  }, [nodeId, value, variables])

  const handleInput = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const editor = event.currentTarget
      editor.dir = "ltr"
      emit(editor)
      refresh()
    },
    [emit, refresh]
  )

  return (
    <div className="message-editor-shell" ref={shellRef}>
      <div
        ref={editorRef}
        className="message-editor-input"
        contentEditable
        dir="ltr"
        lang="en"
        data-empty={!value}
        data-placeholder={placeholder}
        role="textbox"
        aria-label={ariaLabel}
        style={{
          direction: "ltr",
          textAlign: "left",
          unicodeBidi: "isolate",
        }}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(event) => {
          if (!picker) {
            return
          }

          if (event.key === "Escape") {
            event.preventDefault()
            close()
          }

          if (event.key === "Enter" && matches[0]) {
            event.preventDefault()
            insert(matches[0].name)
          }
        }}
        onBlur={(event) => {
          // Pills are applied here so typing never disturbs the caret.
          const editor = event.currentTarget
          const tokenized = tokenizeVariables(editor.innerHTML, variables)

          if (tokenized !== editor.innerHTML) {
            editor.innerHTML = tokenized
            emit(editor)
          }
        }}
      />

      {picker && matches.length > 0 && (
        <VariablePickerList
          top={picker.top}
          left={picker.left}
          matches={matches}
          onPick={insert}
        />
      )}
    </div>
  )
}

export default MessageEditorInput
