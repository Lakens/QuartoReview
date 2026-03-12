import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import React, { useState, useRef, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown, faPlay, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons';

import { getWebR, getWebRStatus } from '../utils/webRSingleton';

export const CodeCell = Node.create({
  name: 'codeCell',
  group: 'block',
  atom: true,
  isolating: true,

  addAttributes() {
    return {
      source: {
        default: [],
        parseHTML: element => {
          const source = element.getAttribute('data-source');
          return source ? source.split('\n').map(line => line + '\n') : [];
        },
        renderHTML: attributes => {
          const source = Array.isArray(attributes.source) ? attributes.source.join('') : attributes.source;
          return { 'data-source': source };
        }
      },
      outputs: { default: [] },
      executionCount: { default: null },
      metadata: {
        default: {
          collapsed: true,
          scrolled: false
        }
      },
      folded: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="code-cell"]' }];
  },

  renderHTML() {
    return ['div', { 'data-type': 'code-cell', contenteditable: false }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeCellNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const posBefore = $from.pos - 2;
        const prevNode = posBefore >= 0 ? state.doc.nodeAt(posBefore) : null;
        if (prevNode?.type.name === 'codeCell') {
          editor.commands.setTextSelection(posBefore);
          return true;
        }
        return false;
      },

      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const posAfter = $from.pos + 1;
        const nextNode = posAfter < state.doc.content.size ? state.doc.nodeAt(posAfter) : null;
        if (nextNode?.type.name === 'codeCell') {
          editor.commands.setTextSelection(posAfter + 1);
          return true;
        }
        return false;
      },
    };
  }
});

function CodeCellNodeView({ node, editor, getPos }) {
  const { source, outputs, folded, metadata } = node.attrs;
  const [showCode, setShowCode] = useState(!folded);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const textareaRef = useRef(null);

  // Attach native (non-React) keyboard listeners directly on the textarea so
  // they fire at the source element during bubble, before ProseMirror's
  // listener on the editor div gets a chance to swallow the events.
  // React 17+ synthetic events are delegated to the React root, which is
  // higher in the DOM than the ProseMirror element — so they fire too late.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    el.addEventListener('keydown', stop);
    el.addEventListener('keyup', stop);
    el.addEventListener('keypress', stop);
    return () => {
      el.removeEventListener('keydown', stop);
      el.removeEventListener('keyup', stop);
      el.removeEventListener('keypress', stop);
    };
  }, [showCode]);

  const handleDelete = () => {
    const pos = getPos();
    if (typeof pos === 'number') {
      editor.view.dispatch(
        editor.view.state.tr.delete(pos, pos + node.nodeSize)
      );
    }
  };

  const toggleCode = () => {
    setShowCode((prev) => !prev);
    const pos = getPos();
    if (typeof pos === 'number') {
      editor.chain()
        .setTextSelection(pos)
        .updateAttributes('codeCell', {
          folded: !showCode,
          metadata: { ...metadata, collapsed: !showCode }
        })
        .run();
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRunError(null);

    try {
      const webR = await getWebR();
      const shelter = await new webR.Shelter();

      try {
        const code = Array.isArray(source) ? source.join('') : (source || '');

        // Close any canvas device left open from a previous run, then open a
        // fresh one.  We do NOT call dev.off() after the user code because that
        // sends a blank final canvasImage which would overwrite the real plot.
        // invisible() suppresses the return values so they don't print as text.
        const wrappedCode = `invisible(try(dev.off(), silent=TRUE))\ninvisible(webr::canvas())\n${code}`;

        const { output } = await shelter.captureR(wrappedCode, {
          withAutoprint: true,
          captureStreams: true,
          captureConditions: false,
        });

        // Collect any canvas (plot) messages queued during evaluation
        const pendingMessages = await webR.flush();

        // Build Jupyter-compatible output array
        const newOutputs = [];

        // --- Text output ---
        let stdoutText = '';
        let stderrText = '';
        for (const item of output) {
          if (item.type === 'stdout') stdoutText += item.data;
          else if (item.type === 'stderr') stderrText += item.data;
        }
        if (stdoutText) {
          newOutputs.push({ output_type: 'stream', name: 'stdout', text: stdoutText });
        }
        if (stderrText) {
          newOutputs.push({ output_type: 'stream', name: 'stderr', text: stderrText });
        }

        // --- Plot output ---
        // canvasImage messages are INCREMENTAL — each bitmap contains only what
        // was drawn in that step (like a display list entry). To get the final
        // image we must composite all bitmaps per page onto an OffscreenCanvas,
        // exactly as webR's built-in canvas handler does internally.
        // canvasNewPage signals the start of a new plot/page.
        let currentPageBitmaps = [];
        const pages = [];
        for (const msg of pendingMessages) {
          if (msg.type === 'canvas') {
            if (msg.data?.event === 'canvasNewPage') {
              if (currentPageBitmaps.length > 0) pages.push([...currentPageBitmaps]);
              currentPageBitmaps = [];
            } else if (msg.data?.event === 'canvasImage') {
              currentPageBitmaps.push(msg.data.image);
            }
          }
        }
        if (currentPageBitmaps.length > 0) pages.push(currentPageBitmaps);

        for (const bitmaps of pages) {
          try {
            const w = bitmaps[0].width;
            const h = bitmaps[0].height;
            const offscreen = new OffscreenCanvas(w, h);
            const ctx = offscreen.getContext('2d');
            for (const bitmap of bitmaps) {
              ctx.drawImage(bitmap, 0, 0);
            }
            const blob = await offscreen.convertToBlob({ type: 'image/png' });
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            newOutputs.push({
              output_type: 'display_data',
              data: { 'image/png': base64 },
              metadata: {}
            });
          } catch (_) {
            // If compositing fails, silently skip the plot
          }
        }

        // Persist outputs back onto the TipTap node
        const pos = getPos();
        if (typeof pos === 'number') {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              outputs: newOutputs,
            })
          );
        }
      } finally {
        await shelter.purge();
      }
    } catch (err) {
      setRunError(err.message || 'R execution failed');
    } finally {
      setRunning(false);
    }
  };

  const lang = metadata?.language || 'r';

  return (
    <NodeViewWrapper as="div" data-type="code-cell" className="code-cell">
      <div className="code-cell-header">
        <button
          onClick={toggleCode}
          className="code-cell-toggle"
          title={showCode ? 'Hide Code' : 'Show Code'}
        >
          <FontAwesomeIcon icon={showCode ? faChevronUp : faChevronDown} />
          <span className="code-cell-toggle-text">{lang}</span>
        </button>

        <button
          onClick={handleRun}
          className={`code-cell-run-btn${running ? ' code-cell-run-btn--running' : ''}`}
          disabled={running}
          title={running ? 'Running…' : 'Run chunk'}
        >
          <FontAwesomeIcon icon={running ? faSpinner : faPlay} spin={running} />
          <span>{running
            ? (getWebRStatus() === 'loading' ? 'Starting R…' : 'Running…')
            : 'Run'
          }</span>
        </button>

        <button
          onClick={handleDelete}
          className="code-cell-delete-btn"
          title="Delete chunk"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>

      {showCode && (
        <textarea
          className="code-cell-content code-cell-textarea"
          value={Array.isArray(source) ? source.join('') : (source || '')}
          onChange={(e) => {
            const pos = getPos();
            if (typeof pos === 'number') {
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  source: e.target.value,
                })
              );
            }
          }}
          ref={textareaRef}
          spellCheck={false}
          rows={Math.max(3, (Array.isArray(source) ? source.join('') : (source || '')).split('\n').length)}
        />
      )}

      {runError && (
        <div className="code-cell-run-error">
          <strong>Error:</strong> {runError}
        </div>
      )}

      {outputs && outputs.map((out, i) => renderOutput(out, i))}
    </NodeViewWrapper>
  );
}

function renderOutput(output, index) {
  if (output.output_type === 'stream') {
    const isErr = output.name === 'stderr';
    const text = Array.isArray(output.text) ? output.text.join('') : output.text;
    // kableExtra and other HTML-producing functions write HTML to stdout
    if (!isErr && /<[a-zA-Z]/.test(text)) {
      return (
        <div
          key={index}
          className="code-cell-output-html"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      );
    }
    return (
      <pre key={index} className={`code-cell-output-stream${isErr ? ' code-cell-output-stderr' : ''}`}>
        <code>{text}</code>
      </pre>
    );
  }

  if (output.data) {
    if (output.data['text/html']) {
      const htmlContent = Array.isArray(output.data['text/html'])
        ? output.data['text/html'].join('')
        : output.data['text/html'];
      return (
        <div
          key={index}
          className="code-cell-output-html"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );
    }

    if (output.data['image/png']) {
      return (
        <div key={index} className="code-cell-output-image">
          <img src={`data:image/png;base64,${output.data['image/png']}`} alt="R output" />
        </div>
      );
    }

    if (output.data['text/plain']) {
      return (
        <pre key={index} className="code-cell-output-text">
          <code>
            {Array.isArray(output.data['text/plain'])
              ? output.data['text/plain'].join('')
              : output.data['text/plain']}
          </code>
        </pre>
      );
    }
  }

  return (
    <pre key={index} className="code-cell-output-json">
      <code>{JSON.stringify(output, null, 2)}</code>
    </pre>
  );
}
