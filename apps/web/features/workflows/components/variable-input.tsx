"use client"

import { useLayoutEffect, useRef, type FormEvent } from "react"

import {
  htmlToTemplateText,
  plainToTokenizedHtml,
  type WorkflowVariable,
} from "../lib/variable-tokens"
import { useVariablePicker } from "./use-variable-picker"
import { VariablePickerList } from "./variable-picker-list"

/**
 * Single-line field that shows {{variables}} as pills.
 *
 * A real <input> cannot render markup, so this is a contenteditable that looks
 * like one. Its stored value stays plain text — the runtime interpolates these
 * fields without stripping HTML first.
 */
export const VariableInput = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  variables = [],
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
  variables?: WorkflowVariable[]
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)

  const emit = (editor: HTMLDivElement) =>
    onChange(htmlToTemplateText(editor.innerHTML))

  const { picker, matches, refresh, insert, close } = useVariablePicker({
    shellRef,
    editorRef,
    variables,
    onInserted: emit,
  })

  useLayoutEffect(() => {
    const editor = editorRef.current

    if (!editor || document.activeElement === editor) {
      return
    }

    const next = plainToTokenizedHtml(value ?? "", variables)

    if (editor.innerHTML !== next) {
      editor.innerHTML = next
    }
  }, [value, variables])

  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    emit(event.currentTarget)
    refresh()
  }

  return (
    <div className="variable-input-shell" ref={shellRef}>
      <div
        ref={editorRef}
        className="variable-input"
        contentEditable
        dir="ltr"
        role="textbox"
        aria-label={ariaLabel}
        data-empty={!value}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(event) => {
          // Single-line: never let Enter insert a break.
          if (event.key === "Enter") {
            event.preventDefault()

            if (picker && matches[0]) {
              insert(matches[0].name)
            }
            return
          }

          if (event.key === "Escape" && picker) {
            event.preventDefault()
            close()
          }
        }}
        onBlur={(event) => {
          const editor = event.currentTarget
          const next = plainToTokenizedHtml(
            htmlToTemplateText(editor.innerHTML),
            variables
          )

          if (editor.innerHTML !== next) {
            editor.innerHTML = next
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

export default VariableInput
