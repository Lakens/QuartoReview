import express from 'express';
import { Octokit } from '@octokit/rest';
import http from 'http';
const router = express.Router();

async function loadBibliography(req, res) {
  try {
    const { repository, notebookPath } = req.query;
    if (!repository || !notebookPath) {
      return res.status(400).json({ error: 'Repository and notebookPath parameters are required' });
    }

    const token = req.session?.githubToken || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('No GitHub token found in session');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = repository.split('/');

    // Get the directory of the notebook
    const notebookDir = notebookPath.substring(0, notebookPath.lastIndexOf('/'));
    const bibPath = `${notebookDir}/references.bib`;

    try {
      // Try to get references.bib from the same directory as the notebook
      const { data: bibFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: bibPath
      });

      const content = Buffer.from(bibFile.content, 'base64').toString('utf8');
      res.json({ 
        content,
        path: bibPath,
        sha: bibFile.sha
      });
    } catch (error) {
      if (error.status === 404) {
        // If references.bib doesn't exist, return an empty response
        res.json({ 
          content: '',
          path: bibPath
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error loading bibliography:', error);
    res.status(500).json({ error: 'Failed to load bibliography' });
  }
}

async function saveBibliography(req, res) {
  try {
    const { content, path, repository, sha } = req.body;
    
    if (!content || !path || !repository) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['content', 'path', 'repository'],
        received: { content: !!content, path: !!path, repository: !!repository }
      });
    }

    const token = req.session?.githubToken || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('No GitHub token found in session');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = repository.split('/');

    try {
      const response = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: path.replace(/^\/+/, ''), // Remove leading slashes
        message: 'Update bibliography file',
        content: Buffer.from(content).toString('base64'),
        ...(sha && { sha })
      });

      res.json({ 
        content: {
          path: response.data.content.path,
          sha: response.data.content.sha
        }
      });
    } catch (error) {
      console.error('Error saving bibliography:', error);
      if (error.status === 404) {
        res.status(404).json({ error: 'Repository or file not found' });
      } else if (error.status === 409) {
        res.status(409).json({ error: 'Conflict: File has been modified' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error saving bibliography:', error);
    res.status(500).json({ error: 'Failed to save bibliography' });
  }
}

function bbtRequest({ path, method = 'GET', body = null, timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 23119,
      path,
      method,
      timeout: timeoutMs,
      headers: {
        'X-Zotero-Connector-API-Version': '2',
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Zotero request timed out')); });
    if (body) req.write(body);
    req.end();
  });
}

async function zoteroPickReference(req, res) {
  try {
    // Step 1: open Zotero picker — returns LaTeX like \autocite{key1,key2}
    const cayw = await bbtRequest({ path: '/better-bibtex/cayw?format=biblatex' });
    if (cayw.statusCode !== 200) {
      console.error('[Zotero CAYW] status', cayw.statusCode, cayw.body.slice(0, 200));
      return res.status(503).json({ error: cayw.body.trim() || 'Better BibTeX CAYW failed.' });
    }

    // Extract citation keys from \autocite{key1,key2} or \cite{key}
    const keys = [];
    for (const m of cayw.body.matchAll(/\\[a-zA-Z]*cite[a-zA-Z]*\{([^}]+)\}/g)) {
      keys.push(...m[1].split(',').map(k => k.trim()).filter(Boolean));
    }
    if (keys.length === 0) {
      return res.status(503).json({ error: 'No citation keys found in: ' + cayw.body.trim() });
    }

    // Step 2: fetch full BibTeX entries via JSON-RPC
    // Better BibTeX translator ID: ca65189f-8815-4afe-8c8b-6e0598acf4e4
    const rpcBody = JSON.stringify({
      jsonrpc: '2.0', method: 'item.export',
      params: { citekeys: keys, translator: 'Better BibTeX' }
    });
    let rpc;
    try {
      rpc = await bbtRequest({ path: '/better-bibtex/json-rpc', method: 'POST', body: rpcBody, timeoutMs: 30000 });
    } catch (rpcErr) {
      console.error('[Zotero RPC] request failed:', rpcErr.message);
      return res.status(503).json({ error: 'JSON-RPC request to Zotero failed: ' + rpcErr.message });
    }

    console.log('[Zotero RPC] status:', rpc.statusCode, 'body:', rpc.body.slice(0, 300));

    let rpcResult;
    try {
      rpcResult = JSON.parse(rpc.body);
    } catch (parseErr) {
      console.error('[Zotero RPC] JSON parse failed, raw body:', rpc.body.slice(0, 300));
      return res.status(503).json({ error: 'Unexpected response from Zotero: ' + rpc.body.slice(0, 100) });
    }

    if (rpcResult?.error) {
      console.error('[Zotero RPC] JSON-RPC error:', rpcResult.error);
      return res.status(503).json({ error: 'Zotero RPC error: ' + JSON.stringify(rpcResult.error) });
    }

    const bibtex = rpcResult?.result;
    if (!bibtex || !bibtex.trim().startsWith('@')) {
      console.error('[Zotero RPC] unexpected result:', rpc.body.slice(0, 300));
      return res.status(503).json({ error: 'Could not retrieve BibTeX entry from Zotero.' });
    }

    res.json({ bibtex });
  } catch (err) {
    console.error('[Zotero CAYW] Error:', err.message, err.stack);
    res.status(503).json({ error: 'Could not reach Zotero. Make sure Zotero is open with Better BibTeX installed.' });
  }
}

router.get('/load', loadBibliography);
router.post('/save', saveBibliography);
router.get('/zotero-pick', zoteroPickReference);

export default router;
