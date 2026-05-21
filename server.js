const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const TODOS_FILE = path.join(__dirname, 'todos.md');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Parse todos.md and return items for a given date.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {{ date: string, items: Array<{ checked: boolean, text: string }>, raw: string }}
 */
function parseTodosForDate(dateStr) {
  const content = fs.readFileSync(TODOS_FILE, 'utf-8');
  const sections = content.split(/^(# \d{4}-\d{2}-\d{2})/m);

  for (let i = 1; i < sections.length; i += 2) {
    const header = sections[i].replace('# ', '').trim();
    if (header === dateStr) {
      const body = sections[i + 1] || '';
      const items = [];
      const lines = body.split('\n');
      for (const line of lines) {
        const match = line.match(/^- \[([ xX])\]\s+(.+)/);
        if (match) {
          items.push({
            checked: match[1].toLowerCase() === 'x',
            text: match[2].trim()
          });
        }
      }
      return { date: dateStr, items, raw: body.trim() };
    }
  }
  return { date: dateStr, items: [], raw: '' };
}

/**
 * Get today's date string in YYYY-MM-DD format.
 * @returns {string}
 */
function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Toggle the checked state of a todo item at the given index.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} index - Zero-based index of the item
 */
function toggleTodoItem(dateStr, index) {
  const content = fs.readFileSync(TODOS_FILE, 'utf-8');
  const lines = content.split('\n');
  let currentSection = null;
  let itemIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const headerMatch = lines[i].match(/^# (\d{4}-\d{2}-\d{2})/);
    if (headerMatch) {
      currentSection = headerMatch[1];
      continue;
    }
    if (currentSection === dateStr) {
      const itemMatch = lines[i].match(/^- \[([ xX])\]\s+/);
      if (itemMatch) {
        itemIndex++;
        if (itemIndex === index) {
          const isChecked = itemMatch[1].toLowerCase() === 'x';
          const newChecked = isChecked ? ' ' : 'x';
          lines[i] = lines[i].replace(/^- \[[ xX]\]/, `- [${newChecked}]`);
          break;
        }
      }
    }
  }

  fs.writeFileSync(TODOS_FILE, lines.join('\n'), 'utf-8');
}

/**
 * Save edited markdown content for a given date.
 * If the date section exists, replace it; otherwise append it.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} rawMarkdown - The raw markdown body (without the # header)
 */
function saveTodosForDate(dateStr, rawMarkdown) {
  let content = '';
  if (fs.existsSync(TODOS_FILE)) {
    content = fs.readFileSync(TODOS_FILE, 'utf-8');
  }

  const lines = content.split('\n');
  let sectionStart = -1;
  let sectionEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const headerMatch = lines[i].match(/^# (\d{4}-\d{2}-\d{2})/);
    if (headerMatch) {
      if (headerMatch[1] === dateStr && sectionStart === -1) {
        sectionStart = i;
      } else if (sectionStart !== -1 && sectionEnd === -1) {
        sectionEnd = i;
        break;
      }
    }
  }

  const newSection = `# ${dateStr}\n${rawMarkdown.trim()}`;

  if (sectionStart !== -1) {
    if (sectionEnd === -1) {
      sectionEnd = lines.length;
    }
    lines.splice(sectionStart, sectionEnd - sectionStart, ...newSection.split('\n'));
  } else {
    // Append new section at end
    if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
      lines.push('');
    }
    lines.push(...newSection.split('\n'));
  }

  fs.writeFileSync(TODOS_FILE, lines.join('\n'), 'utf-8');
}

// GET /api/todos - Return today's todo items
app.get('/api/todos', (req, res) => {
  try {
    const dateStr = req.query.date || getTodayStr();
    const data = parseTodosForDate(dateStr);
    res.json(data);
  } catch (err) {
    console.error('Error reading todos:', err);
    res.status(500).json({ error: 'Failed to read todos' });
  }
});

// POST /api/todos/toggle - Toggle a todo item's checked state
app.post('/api/todos/toggle', (req, res) => {
  try {
    const { date, index } = req.body;
    if (!date || index === undefined) {
      return res.status(400).json({ error: 'Missing date or index' });
    }
    toggleTodoItem(date, parseInt(index, 10));
    const data = parseTodosForDate(date);
    res.json(data);
  } catch (err) {
    console.error('Error toggling todo:', err);
    res.status(500).json({ error: 'Failed to toggle todo' });
  }
});

// POST /api/todos/save - Save edited markdown for today
app.post('/api/todos/save', (req, res) => {
  try {
    const { date, raw } = req.body;
    if (!date || raw === undefined) {
      return res.status(400).json({ error: 'Missing date or raw content' });
    }
    saveTodosForDate(date, raw);
    const data = parseTodosForDate(date);
    res.json(data);
  } catch (err) {
    console.error('Error saving todos:', err);
    res.status(500).json({ error: 'Failed to save todos' });
  }
});

app.listen(PORT, () => {
  console.log(`Today Todo server running at http://localhost:${PORT}`);
  console.log('Press F11 in browser for fullscreen experience');
});
