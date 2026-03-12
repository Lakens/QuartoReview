import React, { useRef, useEffect, useState } from 'react';
import {
  FaBold, FaItalic, FaUnderline, FaStrikethrough,
  FaListUl, FaListOl, FaQuoteRight, FaCode,
  FaPalette, FaFill, FaComment, FaUndo, FaRedo,
  FaTextHeight, FaHighlighter, FaImage,
  FaTable, FaToggleOn, FaToggleOff, FaShare, FaBookOpen
} from 'react-icons/fa';
import { BiCodeBlock } from 'react-icons/bi';
import { MdFormatClear } from 'react-icons/md';
import { RiDoubleQuotesL } from 'react-icons/ri';
import { AiOutlineSplitCells, AiOutlineInsertRowBelow } from 'react-icons/ai';
import { BsTable } from 'react-icons/bs';
import '../../styles/components/editor/_toolbar.css';
import { useAuth } from '../../contexts/AuthContext';
import ShareModal from '../Share/ShareModal';
import { zoteroPickReference } from '../../utils/api';
import bibtexParse from 'bibtex-parser-js';

const EditorToolbar = ({ editor, onToggleComments, selectedRepo, filePath, referenceManager }) => {
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);
  const [showBgColorMenu, setShowBgColorMenu] = useState(false);
  const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isZoteroPicking, setIsZoteroPicking] = useState(false);

  const headingMenuRef = useRef(null);
  const textColorMenuRef = useRef(null);
  const bgColorMenuRef = useRef(null);
  const fontFamilyMenuRef = useRef(null);

  const { user } = useAuth();

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showHeadingMenu && headingMenuRef.current && !headingMenuRef.current.contains(e.target)) {
        setShowHeadingMenu(false);
      }
      if (showTextColorMenu && textColorMenuRef.current && !textColorMenuRef.current.contains(e.target)) {
        setShowTextColorMenu(false);
      }
      if (showBgColorMenu && bgColorMenuRef.current && !bgColorMenuRef.current.contains(e.target)) {
        setShowBgColorMenu(false);
      }
      if (showFontFamilyMenu && fontFamilyMenuRef.current && !fontFamilyMenuRef.current.contains(e.target)) {
        setShowFontFamilyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeadingMenu, showTextColorMenu, showBgColorMenu, showFontFamilyMenu]);

  if (!editor) return null;

  // Editor command handlers
  const handleBold = () => editor.chain().focus().toggleBold().run();
  const handleItalic = () => editor.chain().focus().toggleItalic().run();
  const handleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const handleStrikethrough = () => editor.chain().focus().toggleStrike().run();
  const handleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const handleOrderedList = () => editor.chain().focus().toggleOrderedList().run();

  // Track Changes toggle handler
  const handleToggleTrackChanges = () => {
    // Toggle the track change status using the command
    editor.commands.toggleTrackChangeStatus();

    // Get the current state of the TrackChangeExtension
    const trackChangeExtension = editor.extensionManager.extensions.find(
      ext => ext.name === 'trackchange'
    );

    // Check the current enabled status
    const isTracking = trackChangeExtension?.options.enabled;

    // Update the local state to reflect the current status
    setTrackChangesEnabled(isTracking);
  };

  const handleHighlight = () => editor.chain().focus().toggleHighlight().run();

  // Undo/Redo
  const handleUndo = () => editor.chain().focus().undo().run();
  const handleRedo = () => editor.chain().focus().redo().run();

  // Insert Image
  const handleInsertImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // Insert a new empty R code chunk at the cursor
  const handleInsertRChunk = () => {
    editor.chain().focus().insertContent({
      type: 'codeCell',
      attrs: {
        source: '# R code here\n',
        outputs: [],
        executionCount: null,
        metadata: { language: 'r' },
        folded: false,
      }
    }).run();
  };

  // Table handlers
  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleAddColumnBefore = () => editor.chain().focus().addColumnBefore().run();
  const handleAddColumnAfter = () => editor.chain().focus().addColumnAfter().run();
  const handleDeleteColumn = () => editor.chain().focus().deleteColumn().run();
  const handleAddRowBefore = () => editor.chain().focus().addRowBefore().run();
  const handleAddRowAfter = () => editor.chain().focus().addRowAfter().run();
  const handleDeleteRow = () => editor.chain().focus().deleteRow().run();
  const handleDeleteTable = () => editor.chain().focus().deleteTable().run();
  const handleMergeCells = () => editor.chain().focus().mergeCells().run();
  const handleSplitCell = () => editor.chain().focus().splitCell().run();
  const handleToggleHeaderColumn = () => editor.chain().focus().toggleHeaderColumn().run();
  const handleToggleHeaderRow = () => editor.chain().focus().toggleHeaderRow().run();
  const handleToggleHeaderCell = () => editor.chain().focus().toggleHeaderCell().run();

  const handleToggleComments = () => {
    if (onToggleComments) onToggleComments();
  };

  // Open comment dialog
  const handleAddCommentButton = () => {
    setCommentText('');
    setShowCommentDialog(true);
  };

  const handleCommentDialogConfirm = async () => {
    if (!commentText.trim()) {
      setShowCommentDialog(false);
      return;
    }

    // Generate a unique commentId
    const commentId = `comment-${Date.now()}`;

    try {

      const username = 'Michel Nivard'; // Extract the username from the response

      if (!editor) return;

      // Apply the comment mark with the fetched username
      editor.chain().focus().addComment({
        commentId,         // Required by CommentMark
        username,          // Dynamic GitHub username
        text: commentText.trim(), // Comment text
      }).run();

    } catch (error) {
      console.error('Error fetching username or applying comment:', error);
    } finally {
      setShowCommentDialog(false);
      setCommentText('');
    }
  };

  const handleCommentDialogCancel = () => {
    setShowCommentDialog(false);
    setCommentText('');
  };

  // Heading menu logic
  const toggleHeadingMenu = () => setShowHeadingMenu(prev => !prev);
  const applyHeading = (level) => {
    if (level) {
      editor.chain().focus().toggleHeading({ level }).run();
    } else {
      editor.chain().focus().setParagraph().run();
    }
    setShowHeadingMenu(false);
  };

  // Text color logic
  const toggleTextColorMenu = () => setShowTextColorMenu(prev => !prev);
  const applyTextColor = (color) => {
    editor.chain().focus().setColor(color).run();
    setShowTextColorMenu(false);
  };

  // Background color
  const toggleBgColorMenu = () => setShowBgColorMenu(prev => !prev);
  const applyBgColor = (color) => {
    editor.chain().focus().setHighlight({ color }).run();
    setShowBgColorMenu(false);
  };

  const headingLevels = [
    { name: 'Normal Text', value: 0 },
    { name: 'Heading 1', value: 1 },
    { name: 'Heading 2', value: 2 },
    { name: 'Heading 3', value: 3 },
    { name: 'Heading 4', value: 4 },
    { name: 'Heading 5', value: 5 },
    { name: 'Heading 6', value: 6 }
  ];

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080'];
  const bgColors = ['#ffff00', '#ffeb3b', '#caffbf', '#b2fef5', '#f9c2ff', '#ffd6e0'];

  const fontFamilies = [
    { name: 'Inter', value: 'var(--editor-font-primary)' },
    { name: 'Times New Roman', value: 'var(--editor-font-times)' },
    { name: 'Helvetica', value: 'var(--editor-font-helvetica)' },
    { name: 'Georgia', value: 'var(--editor-font-georgia)' },
    { name: 'Garamond', value: 'var(--editor-font-garamond)' }
  ];

  const setFontFamily = (fontFamily) => {
    document.documentElement.style.setProperty('--editor-current-font', fontFamily);
  };

  const addComment = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      // No text selected
      return;
    }

    editor.chain().focus().setComment({
      comment: '',
      author: user?.name || user?.login,
      date: new Date().toISOString(),
      resolved: false
    }).run();
  };

  const handleCiteZotero = async () => {
    if (!editor || !referenceManager || isZoteroPicking) return;
    setIsZoteroPicking(true);
    try {
      const bibtex = await zoteroPickReference();
      if (!bibtex || !bibtex.trim()) return; // user cancelled
      const parsed = bibtexParse.toJSON(bibtex);
      if (!parsed || parsed.length === 0) return;
      for (const entry of parsed) {
        const ref = {
          ...entry,
          citationKey: entry.citationKey || entry.key || '',
          entryTags: entry.entryTags || {}
        };
        referenceManager.addReference(ref);
      }
      await referenceManager.save();
      // Insert citation marks at cursor for each picked entry
      for (const entry of parsed) {
        const citationKey = entry.citationKey || entry.key || '';
        editor.chain().focus().insertContent({
          type: 'text',
          marks: [{
            type: 'citation',
            attrs: {
              citationKey,
              isInBrackets: true,
              referenceDetails: JSON.stringify(entry.entryTags || {}),
              prefix: null,
              suffix: null,
              locator: null,
            }
          }],
          text: `[@${citationKey}]`
        }).run();
      }
    } catch (err) {
      console.error('[Zotero CAYW] Error:', err);
      alert(err.response?.data?.error || 'Could not reach Zotero. Make sure Zotero is open with Better BibTeX installed.');
    } finally {
      setIsZoteroPicking(false);
    }
  };

  return (
    <div className="editor-container">
      <div className="modern-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Undo/Redo */}
        <button className="toolbar-btn" onClick={handleUndo} title="Undo"><FaUndo style={{ fontSize: '1.1em' }} /></button>
        <button className="toolbar-btn" onClick={handleRedo} title="Redo"><FaRedo style={{ fontSize: '1.1em' }} /></button>
        
        {/* Heading Level Select */}
        <div className="toolbar-item">
          <select
            onChange={(e) => {
              const level = parseInt(e.target.value);
              editor.chain().focus().toggleHeading({ level }).run();
            }}
            value={(() => {
              for (let i = 1; i <= 6; i++) {
                if (editor.isActive('heading', { level: i })) return i;
              }
              return 0;
            })()}
            className="glass-select"
            title="Heading Level"
          >
            {headingLevels.map((heading) => (
              <option key={heading.value} value={heading.value}>
                {heading.name}
              </option>
            ))}
          </select>
        </div>

        {/* Font Family Select */}
        <div className="toolbar-item">
          <select
            onChange={(e) => setFontFamily(e.target.value)}
            className="glass-select"
            title="Font Family"
          >
            {fontFamilies.map((font) => (
              <option 
                key={font.name} 
                value={font.value}
                style={{ fontFamily: font.value.replace('var(--editor-font-', '').replace(')', '') }}
              >
                {font.name}
              </option>
            ))}
          </select>
        </div>

        {/* Separator */}
        <div style={{ width:'1px', height:'24px', background:'#ddd', margin:'0 0.5rem' }}></div>

        {/* Bold / Italic / Underline / Strike / Highlight */}
        <button className="toolbar-btn" onClick={handleBold} title="Bold"><FaBold style={{ fontSize: '1.1em' }} /></button>
        <button className="toolbar-btn" onClick={handleItalic} title="Italic"><FaItalic style={{ fontSize: '1.1em' }} /></button>
        <button className="toolbar-btn" onClick={handleUnderline} title="Underline"><FaUnderline style={{ fontSize: '1.1em' }} /></button>
        <button className="toolbar-btn" onClick={handleStrikethrough} title="Strikethrough"><FaStrikethrough style={{ fontSize: '1.1em' }} /></button>
        <button className="toolbar-btn" onClick={handleHighlight} title="Highlight"><FaHighlighter style={{ fontSize: '1.1em' }} /></button>

        {/* Separator */}
        <div style={{ width:'1px', height:'24px', background:'#ddd', margin:'0 0.5rem' }}></div>
        
        {/* Image */}
        <button className="toolbar-btn" onClick={handleInsertImage} title="Insert Image"><FaImage style={{ fontSize: '1.1em' }} /></button>

        {/* Lists */}
        <button className="toolbar-btn" onClick={handleBulletList} title="Bulleted List"><FaListUl style={{ fontSize: '1.1em' }} /></button>
        <button className="toolbar-btn" onClick={handleOrderedList} title="Numbered List"><FaListOl style={{ fontSize: '1.1em' }} /></button>

        {/* Insert R code chunk */}
        <button className="toolbar-btn" onClick={handleInsertRChunk} title="Insert R code chunk">
          <BiCodeBlock style={{ fontSize: '1.1em' }} />
          <span style={{ fontSize: '0.75em', marginLeft: '3px' }}>R</span>
        </button>

        {/* Separator */}
        <div style={{ width:'1px', height:'24px', background:'#ddd', margin:'0 0.5rem' }}></div>

        {/* Table */}
        <div className="table-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button className="toolbar-btn" onClick={handleInsertTable} title="Insert Table"><BsTable style={{ fontSize: '1.1em' }} /></button>
          <button className="toolbar-btn" onClick={handleAddRowAfter} title="Add Row Below"><AiOutlineInsertRowBelow style={{ fontSize: '1.1em' }} /></button>
          <button className="toolbar-btn" onClick={handleAddRowBefore} title="Add Row Above">
            <AiOutlineInsertRowBelow style={{ transform: 'rotate(180deg)', fontSize: '1.1em' }} />
          </button>
          <button className="toolbar-btn" onClick={handleDeleteRow} title="Delete Row">
            <AiOutlineInsertRowBelow style={{ transform: 'rotate(45deg)', fontSize: '1.1em' }} />
          </button>
          <button className="toolbar-btn" onClick={handleSplitCell} title="Split Cell"><AiOutlineSplitCells style={{ fontSize: '1.1em' }} /></button>
          <button className="toolbar-btn" onClick={handleMergeCells} title="Merge Cells">
            <AiOutlineSplitCells style={{ transform: 'rotate(90deg)', fontSize: '1.1em' }} />
          </button>
          <button className="toolbar-btn" onClick={handleToggleHeaderRow} title="Toggle Header Row">H↔</button>
        </div>

        {/* Track Changes */}
        <button
          className="track-changes-btn"
          onClick={handleToggleTrackChanges}
          title="Track Changes"
        >
          <span>Track Changes</span>
          {trackChangesEnabled ? (
            <FaToggleOn style={{ fontSize: '1.1em' }} />
          ) : (
            <FaToggleOff style={{ fontSize: '1.1em' }} />
          )}
        </button>

        {/* Cite from Zotero */}
        <button
          className="toolbar-btn"
          onClick={handleCiteZotero}
          disabled={isZoteroPicking}
          title="Cite from Zotero (Better BibTeX)"
        >
          <FaBookOpen style={{ fontSize: '1.1em' }} />
          <span style={{ fontSize: '0.75em', marginLeft: '3px' }}>{isZoteroPicking ? '…' : 'Cite'}</span>
        </button>

        {/* Share Button */}
        <button
          className="share-btn"
          onClick={() => {
            console.log('Opening share modal, selectedRepo:', selectedRepo);
            setIsShareModalOpen(true);
          }}
          title="Share Document"
        >
          <span>Share Document</span>
          <FaShare style={{ fontSize: '1.1em' }} />
        </button>
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        repository={selectedRepo?.fullName}
        filePath={filePath}
      />
    </div>
  );
};

export default EditorToolbar;
