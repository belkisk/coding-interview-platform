import { useCallback, useRef } from 'react'
import Editor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import * as javascriptLang from 'monaco-editor/esm/vs/basic-languages/javascript/javascript'
import * as pythonLang from 'monaco-editor/esm/vs/basic-languages/python/python'

function CodeEditor({ value, language, onChange }) {
  const isRemoteUpdate = useRef(false)

  const handleChange = useCallback(
    (nextValue) => {
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false
        return
      }
      onChange(nextValue ?? '')
    },
    [onChange]
  )

  const handleBeforeMount = (monaco) => {
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false
    })

    const existing = monaco.languages.getLanguages().map((l) => l.id)

    if (!existing.includes('javascript')) {
      monaco.languages.register({ id: 'javascript' })
      monaco.languages.setMonarchTokensProvider('javascript', javascriptLang.language)
      monaco.languages.setLanguageConfiguration('javascript', javascriptLang.conf)
    }

    if (!existing.includes('python')) {
      monaco.languages.register({ id: 'python' })
      monaco.languages.setMonarchTokensProvider('python', pythonLang.language)
      monaco.languages.setLanguageConfiguration('python', pythonLang.conf)
    }
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="javascript"
      language={language}
      value={value}
      onChange={handleChange}
      beforeMount={handleBeforeMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true
      }}
      onValidate={() => {
        // allow remote updates without emitting change
        isRemoteUpdate.current = true
      }}
    />
  )
}

export default CodeEditor
