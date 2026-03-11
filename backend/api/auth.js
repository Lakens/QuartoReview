import express from 'express';
import axios from 'axios';

const router = express.Router();

// Redirect user to GitHub OAuth
router.get('/', (req, res) => {
  try {
    console.log('Initiating GitHub OAuth flow');

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      scope: 'repo'
    }).toString();
    
    console.log('Redirecting to GitHub with params');
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  } catch (error) {
    console.error('Error in auth redirect:', error.message);
    res.status(500).json({ error: 'Failed to initiate GitHub OAuth' });
  }
});

// Add a route to check session status
router.get('/check', (req, res) => {
  const devMode = process.env.NODE_ENV !== 'production';
  const hasToken = !!req.session?.githubToken || (devMode && !!process.env.GITHUB_TOKEN);
  res.json({
    authenticated: hasToken,
    sessionID: req.sessionID
  });
});

// GitHub OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      console.error('GitHub OAuth: Failed to get access token');
      return res.status(400).json({ error: 'Failed to get access token' });
    }

    // Store token in session
    req.session.githubToken = access_token;
    
    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err.message);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      console.log('Session saved successfully');

      console.log('Authentication successful');

      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'https://resolve.pub';
      
      res.redirect(frontendUrl);
    });
  } catch (error) {
    console.error('Error in auth callback:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Add logout endpoint
router.post('/logout', (req, res) => {
  console.log('Processing logout request');

  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err.message);
      return res.status(500).json({ error: 'Logout failed' });
    }
    console.log('User logged out successfully');
    res.clearCookie('sessionId');
    res.json({ success: true });
  });
});

export default router;
