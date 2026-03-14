import { Node } from '@tiptap/core'
import yaml from 'js-yaml'
import '../styles/components/editor/_raw-cell.css'
import '../styles/components/editor/_yaml-table-editor.css'

function tryParseYaml(content) {
  try {
    if (content.trim().startsWith('---') && content.trim().endsWith('---')) {
      // Extract YAML content between fences, preserving internal whitespace
      const yamlContent = content.replace(/^---\n/, '').replace(/\n?---$/, '');
      const parsedYaml = yaml.load(yamlContent);
      
      if (parsedYaml) {
        // Format the YAML but don't include it in the parsed object
        const formattedYaml = yaml.dump(parsedYaml, {
          lineWidth: -1,
          noRefs: true,
          indent: 2,
          flowLevel: -1
        }).trim(); // Trim any trailing whitespace from the formatted YAML
        return {
          parsed: parsedYaml,
          formatted: formattedYaml
        };
      }
      return { parsed: parsedYaml || {}, formatted: yamlContent.trim() };
    }
  } catch (e) {
    console.error('Failed to parse YAML:', e);
  }
  return null;
}

export const RawCell = Node.create({
    name: 'rawCell',
    group: 'block',
    atom: true,
    selectable: false,
    draggable: false,
    defining: true,
    isolating: true,

    addAttributes() {
      return {
        content: {
          default: ''
        },
        isYamlHeader: {
          default: false
        },
        parsedYaml: {
          default: null
        },
        formattedYaml: {
          default: null
        },
        isAcademicArticle: {
          default: false
        }
      }
    },

    parseHTML() {
      return [{
        tag: 'div[data-type="raw-cell"]',
        getAttrs: dom => ({
          content: dom.textContent,
          isYamlHeader: dom.getAttribute('data-yaml-header') === 'true',
          isAcademicArticle: dom.getAttribute('data-academic') === 'true'
        })
      }]
    }, 
 // hello?
    renderHTML({ node }) {
      const yaml = node.attrs.parsedYaml || {};
      const isYamlHeader = node.attrs.isYamlHeader;
      const isAcademicArticle = node.attrs.isAcademicArticle;

      if (isYamlHeader && isAcademicArticle) {
        return ['div', { 
          'data-type': 'raw-cell',
          'data-yaml-header': 'true',
          'data-academic': 'true',
          class: 'raw-cell academic-frontpage'
        }];
      }

      return ['div', { 
        'data-type': 'raw-cell',
        class: 'raw-cell'
      }];
    },

    addNodeView() {
      return ({ node, getPos, editor }) => {
        console.log('RawCell nodeView rendering with node:', node);
        const dom = document.createElement('div');
        dom.setAttribute('data-type', 'raw-cell');
        dom.classList.add('raw-cell');
        
        if (node.attrs.isYamlHeader && node.attrs.isAcademicArticle) {
          console.log('Rendering academic frontpage');
          dom.classList.add('academic-frontpage');
          const yaml = node.attrs.parsedYaml || {};
          
          const table = document.createElement('div');
          table.classList.add('properties-table');
          
          // Primary fields that should always be at the top
          const primaryFields = ['title', 'subtitle', 'author', 'affiliations', 'date', 'abstract'];
          
          // Create primary fields section
          const primarySection = document.createElement('div');
          primarySection.classList.add('primary-fields');
          primarySection.classList.add('primary-fields--article');
          
          // Create additional fields section
          const additionalSection = document.createElement('div');
          additionalSection.classList.add('additional-fields');
          
          // Helper function to create a basic property row
          const createBasicRow = (key, value) => {
            const row = document.createElement('div');
            row.classList.add('property-row');
            row.setAttribute('data-property', key);
            row.classList.add(`property-row--${key.toLowerCase()}`);
            
            const labelDiv = document.createElement('div');
            labelDiv.classList.add('property-label');
            labelDiv.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            
            const valueDiv = document.createElement('div');
            valueDiv.classList.add('property-value');
            
            let input;
            // Use textarea for abstract or if value is longer than 100 characters
            if (key === 'abstract' || (value && value.length > 100)) {
              input = document.createElement('textarea');
              input.rows = '4';
              input.spellcheck = true;
            } else {
              input = document.createElement('input');
              input.type = 'text';
              input.spellcheck = false;
            }
            
            const setupInputHandling = (input) => {
              // Prevent deletion of the field itself
              input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                  // If at start of field or field is empty, prevent deletion
                  if (input.selectionStart === 0 && input.selectionEnd === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }
                // Prevent deletion via Cut or Delete
                if (e.key === 'Delete' || (e.key === 'x' && (e.ctrlKey || e.metaKey))) {
                  if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }
              });

              // Handle click events to maintain focus
              input.addEventListener('mousedown', (e) => {
                e.stopPropagation();
              });
              
              input.addEventListener('click', (e) => {
                e.stopPropagation();
                input.focus();
              });
              
              // Make the input non-draggable
              input.draggable = false;
            };

            setupInputHandling(input);
            
            if (key === 'abstract' || (value && value.length > 100)) {
              // Auto-expand textarea
              const adjustHeight = () => {
                input.style.height = 'auto';
                input.style.height = input.scrollHeight + 'px';
              };
              
              input.addEventListener('input', (e) => {
                const newYaml = { ...yaml };
                newYaml[key] = e.target.value;
                adjustHeight();
                
                // Format the YAML
                const formattedYaml = Object.entries(newYaml)
                  .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`)
                  .join('\n');
                
                const yamlContent = `---\n${formattedYaml}\n---`;
                
                // Get the current position
                const pos = getPos();
                
                // Create a transaction to update the node
                const tr = editor.state.tr;
                
                // Update the node's attributes and content
                if (typeof pos === 'number') {
                  console.log('Updating YAML at position:', pos, 'with content:', yamlContent);
                  tr.setNodeMarkup(pos, undefined, {
                    content: yamlContent,
                    parsedYaml: newYaml,
                    formattedYaml: formattedYaml,
                    isYamlHeader: true,
                    isAcademicArticle: true
                  });
                  
                  // Dispatch the transaction
                  editor.view.dispatch(tr);
                  console.log('Transaction dispatched');
                }
              });
              
              // Initial height adjustment
              setTimeout(adjustHeight, 0);
            } else {
              input.addEventListener('input', (e) => {
                const newYaml = { ...yaml };
                
                // Handle nested properties
                const parent = e.target.closest('.property-row').getAttribute('data-parent');
                const property = e.target.getAttribute('data-property');
                
                if (parent) {
                  // This is a nested property
                  if (!newYaml[parent]) {
                    newYaml[parent] = {};
                  }
                  newYaml[parent][property] = e.target.value;
                } else {
                  // This is a top-level property
                  newYaml[property] = e.target.value;
                }
                
                // Format the YAML
                const formattedYaml = Object.entries(newYaml)
                  .map(([k, v]) => {
                    if (typeof v === 'object') {
                      const nested = Object.entries(v)
                        .map(([sk, sv]) => `  ${sk}: ${JSON.stringify(sv)}`)
                        .join('\n');
                      return `${k}:\n${nested}`;
                    }
                    return `${k}: ${JSON.stringify(v)}`;
                  })
                  .join('\n');
                
                const yamlContent = `---\n${formattedYaml}\n---`;
                
                // Get the current position
                const pos = getPos();
                
                // Create a transaction to update the node
                const tr = editor.state.tr;
                
                // Update the node's attributes and content
                if (typeof pos === 'number') {
                  console.log('Updating YAML at position:', pos, 'with content:', yamlContent);
                  tr.setNodeMarkup(pos, undefined, {
                    content: yamlContent,
                    parsedYaml: newYaml,
                    formattedYaml: formattedYaml,
                    isYamlHeader: true,
                    isAcademicArticle: true
                  });
                  
                  // Dispatch the transaction
                  editor.view.dispatch(tr);
                  console.log('Transaction dispatched');
                }
              });
            }
            
            input.value = value || '';
            input.setAttribute('data-property', key);
            input.classList.add(`property-input--${key.toLowerCase()}`);
            valueDiv.appendChild(input);
            
            row.appendChild(labelDiv);
            row.appendChild(valueDiv);
            return row;
          };

          // Helper function to create a property row
          const createPropertyRow = (key, value) => {
            // If value is an object or array, create rows for each nested entry
            if (typeof value === 'object' && value !== null) {
              const container = document.createElement('div');
              
              // Create the parent row first
              const parentRow = createBasicRow(key, '');
              container.appendChild(parentRow);
              
              // Then create child rows for each property in the object/array
              Object.entries(value).forEach(([subKey, subValue]) => {
                const childRow = createBasicRow(subKey, subValue);
                childRow.setAttribute('data-parent', key);
                container.appendChild(childRow);
              });
              
              return container;
            }
            
            // For primitive values, just create a basic row
            return createBasicRow(key, value);
          };
          
          // Sort fields into primary and additional
          Object.entries(yaml).forEach(([key, value]) => {
            if (primaryFields.includes(key.toLowerCase())) {
              primarySection.appendChild(createPropertyRow(key, value));
            } else {
              additionalSection.appendChild(createPropertyRow(key, value));
            }
          });
          
          // Create additional fields header with dropdown
          const additionalHeader = document.createElement('div');
          additionalHeader.classList.add('additional-fields-header');
          additionalHeader.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Additional Fields
          `;
          
          const additionalContent = document.createElement('div');
          additionalContent.classList.add('additional-fields-content');
          
          // Add click handler for dropdown
          additionalHeader.addEventListener('click', () => {
            additionalHeader.classList.toggle('expanded');
            additionalContent.classList.toggle('expanded');
          });
          
          // Only add additional section if there are additional fields
          if (additionalSection.children.length > 0) {
            additionalContent.appendChild(additionalSection);
            table.appendChild(primarySection);
            table.appendChild(additionalHeader);
            table.appendChild(additionalContent);
          } else {
            table.appendChild(primarySection);
          }
          
          dom.appendChild(table);
        } else {
          const content = document.createElement('div');
          content.classList.add('raw-content');
          content.textContent = node.attrs.content || '';
          content.contentEditable = 'true';
          dom.appendChild(content);
        }

        return {
          dom,
          update: (updatedNode) => {
            if (updatedNode.type.name !== node.type.name) return false;
            return true;
          },
          destroy: () => {
            // Cleanup if needed
          }
        };
      };
    },
    
    addKeyboardShortcuts() {
      return {
        Backspace: ({ editor }) => {
          const { selection } = editor.state;
          const { $from } = selection;

          // Case 1: Prevent Backspace when the cursor is inside the rawCell node
          if ($from.parent.type.name === 'rawCell' && $from.parentOffset === 0) {
            return true; // Block the backspace
          }

          // Case 2: Prevent Backspace when the cursor is directly below the rawCell node
          const posBefore = $from.before($from.depth);
          const prevNode = editor.state.doc.nodeAt(posBefore);
          if (prevNode && prevNode.type.name === 'rawCell') {
            return true; // Block backspace from deleting the rawCell
          }
    
          // Case 3: Prevent Backspace when merging blocks (text exists before the rawCell node)
          if (
            prevNode &&
            prevNode.type.name === 'rawCell' &&
            $from.parentOffset === 0 // Cursor is at the start of the block following the rawCell
          ) {
            return true; // Block Backspace
          }
    
          return false; // Allow default behavior
        },
    
        Delete: ({ editor }) => {
          const { selection } = editor.state;
          const { $from } = selection;

          // Case 1: Prevent Delete when the cursor is inside the rawCell node
          if (
            $from.parent.type.name === 'rawCell' &&
            $from.parentOffset === $from.parent.nodeSize - 2
          ) {
            return true; // Block the delete
          }

          // Case 2: Prevent Delete when the cursor is directly above the rawCell node
          const posAfter = $from.after($from.depth);
          const nextNode = editor.state.doc.nodeAt(posAfter);
          if (nextNode && nextNode.type.name === 'rawCell') {
            return true; // Block delete from removing the rawCell
          }
    
          return false; // Allow default behavior
        },
      };
    }
    
    
});
