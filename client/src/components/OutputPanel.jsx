function OutputPanel({ output }) {
  return (
    <div className="output">
      <pre>{output || 'Run code to see results here.'}</pre>
    </div>
  )
}

export default OutputPanel
