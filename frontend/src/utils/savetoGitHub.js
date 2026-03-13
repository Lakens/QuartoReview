import { getCurrentTime, get30MinutesAgo, isWithin30Minutes } from './timeUtils';
import { saveNotebook } from './api';

export async function saveQmdToGitHub(qmdString, filePath, selectedRepo, commitMessage) {
  if (!selectedRepo?.fullName) {
    throw new Error('No repository selected');
  }
  return saveNotebook(qmdString, filePath, selectedRepo.fullName, commitMessage);
}

export async function saveToGitHub(newIpynb, filePath, selectedRepo, user, commitMessage) {
    if (!selectedRepo) {
      throw new Error('No repository selected');
    }

    if (!selectedRepo.fullName) {
      throw new Error('Invalid repository format: missing fullName');
    }

    // Initialize metadata if needed
    if (!newIpynb.metadata) {
      newIpynb.metadata = {};
    }
    if (!newIpynb.metadata.active_editors) {
      newIpynb.metadata.active_editors = [];
    }
    
    // Remove editors that are older than 30 minutes
    newIpynb.metadata.active_editors = newIpynb.metadata.active_editors.filter(editor => 
      isWithin30Minutes(editor.timestamp)
    );

    // Check if this user is already in the list
    const existingEditorIndex = newIpynb.metadata.active_editors.findIndex(
      editor => editor.name === (user.name || user.login)
    );

    const newEditor = {
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      timestamp: getCurrentTime()
    };

    if (existingEditorIndex === -1) {
      // Add new editor to the list
      newIpynb.metadata.active_editors.push(newEditor);
    } else {
      // Update timestamp for existing editor
      newIpynb.metadata.active_editors[existingEditorIndex].timestamp = getCurrentTime();
    }

    try {
      // Pass the repository full name instead of the whole object
      const result = await saveNotebook(newIpynb, filePath, selectedRepo.fullName, commitMessage);
      return result;
    } catch (error) {
      console.error('Error saving notebook:', error);
      throw error;
    }
}
