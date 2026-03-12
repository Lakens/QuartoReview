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

async function zoteroPickReference(req, res) {
  // Proxy to Better BibTeX CAYW endpoint — blocks until user picks in Zotero
  const bbtUrl = 'http://localhost:23119/better-bibtex/cayw?format=bibtex';
  try {
    const bibtex = await new Promise((resolve, reject) => {
      const request = http.get(bbtUrl, { timeout: 120000 }, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => resolve(data));
      });
      request.on('error', reject);
      request.on('timeout', () => { request.destroy(); reject(new Error('Zotero request timed out')); });
    });
    res.json({ bibtex });
  } catch (err) {
    console.error('[Zotero CAYW] Error:', err.message);
    res.status(503).json({ error: 'Could not reach Zotero. Make sure Zotero is open with Better BibTeX installed.' });
  }
}

router.get('/load', loadBibliography);
router.post('/save', saveBibliography);
router.get('/zotero-pick', zoteroPickReference);

export default router;
