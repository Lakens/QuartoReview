// backend/api/fetchRawFile.js
// Returns raw base64-encoded content for any file in a repository.
// Used by the frontend to populate WebR's virtual filesystem with data files
// referenced by library(readxl) / read_csv() / load() etc. in R chunks.
import express from 'express';
import { Octokit } from '@octokit/rest';
import { sanitizePath } from '../middleware/security.js';

const router = express.Router();

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

router.get('/', async (req, res) => {
  try {
    const { path: filePath, repository } = req.query;

    const token = req.session.githubToken || process.env.GITHUB_TOKEN;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    if (!repository) return res.status(400).json({ error: 'Repository not specified' });
    if (!filePath) return res.status(400).json({ error: 'File path not specified' });

    const [owner, repo] = repository.split('/');
    const sanitizedPath = sanitizePath(filePath);

    const octokit = new Octokit({ auth: token });

    const response = await octokit.repos.getContent({ owner, repo, path: sanitizedPath });

    if (!response.data || response.data.type !== 'file') {
      return res.status(404).json({ error: 'File not found' });
    }

    if (response.data.size > MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({
        error: `File too large (${Math.round(response.data.size / 1024)} KB). Maximum is 5 MB.`
      });
    }

    // GitHub always returns content as base64; strip newlines and pass through.
    // The frontend writes the decoded bytes directly into WebR's virtual FS.
    const base64 = (response.data.content || '').replace(/\n/g, '');

    res.json({ content: base64, size: response.data.size });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: 'File not found' });
    console.error('Error fetching raw file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

export default router;
