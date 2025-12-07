let pyodideLoader = null

const loadPyodide = async () => {
  if (!pyodideLoader) {
    pyodideLoader = import('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js')
      .then(({ loadPyodide }) => loadPyodide())
      .catch(() => null)
  }
  return pyodideLoader
}

const createJsWorker = () => {
  const workerSource = `
    const toText = (val) => {
      try {
        if (typeof val === 'object') return JSON.stringify(val, null, 2);
        return String(val);
      } catch (e) {
        return String(val);
      }
    };
    self.onmessage = (e) => {
      let output = '';
      const originalLog = console.log;
      const originalErr = console.error;
      console.log = (...args) => { output += args.map(toText).join(' ') + '\\n'; };
      console.error = (...args) => { output += 'Error: ' + args.map(toText).join(' ') + '\\n'; };
      try {
        const fn = new Function(e.data);
        fn();
        self.postMessage({ ok: true, output: output || '(no output)' });
      } catch (err) {
        self.postMessage({ ok: false, output: output + 'Error: ' + err.message });
      } finally {
        console.log = originalLog;
        console.error = originalErr;
      }
    };
  `
  const blob = new Blob([workerSource], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob))
}

export async function executeCode(code, language) {
  const lang = (language || '').toLowerCase()

  if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
    return new Promise((resolve) => {
      const worker = createJsWorker()
      const timeout = setTimeout(() => {
        worker.terminate()
        resolve('Error: Code execution timeout (5s)')
      }, 5000)
      worker.onmessage = (msg) => {
        clearTimeout(timeout)
        worker.terminate()
        resolve(msg.data.output)
      }
      worker.onerror = (err) => {
        clearTimeout(timeout)
        worker.terminate()
        resolve(`Error: ${err.message}`)
      }
      worker.postMessage(code)
    })
  }

  if (lang === 'python' || lang === 'py') {
    const pyodide = await loadPyodide()
    if (!pyodide) {
      return 'Python runtime unavailable in offline mode.'
    }
    try {
      const wrapped = `
import sys, io
from contextlib import redirect_stdout
buf = io.StringIO()
with redirect_stdout(buf):
    exec("""${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}""")
buf.getvalue()
`
      const result = await pyodide.runPythonAsync(wrapped)
      return result || '(no output)'
    } catch (err) {
      return `Error: ${err.message}`
    }
  }

  return `Execution for ${language} is not available in-browser. Try JavaScript or Python.`
}
