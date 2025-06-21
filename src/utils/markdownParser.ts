import { Todo, Lane, KanbanData, Automation, RESTRICTED_LANES } from '../types';

export function parseMarkdown(content: string): KanbanData {
  const lines = content.split('\n');
  const lanes: Lane[] = [];
  const automations: Automation[] = [];

  let currentLane: Lane | null = null;
  let todoOrder = 0;
  let laneOrder = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse lane header
    if (line.startsWith('## ')) {
      if (currentLane) {
        lanes.push(currentLane);
      }

      const laneName = line.substring(3).trim();
      currentLane = {
        id: laneName.toLowerCase().replace(/\s+/g, '-'),
        name: laneName,
        todos: [],
        isRestricted: RESTRICTED_LANES.includes(laneName),
        order: laneOrder++
      };
      todoOrder = 0;
    }

    // Parse todo item
    else if (line.startsWith('- [ ] ') && currentLane) {
      const todoText = line.substring(6);
      const todo = parseTodo(todoText, currentLane.id, todoOrder++);
      currentLane.todos.push(todo);
    }

    // Parse automation
    else if (line.includes(':') && line.includes(':[')) {
      const automation = parseAutomation(line);
      if (automation) {
        automations.push(automation);
      }
    }
  }

  if (currentLane) {
    lanes.push(currentLane);
  }

  return { lanes, automations };
}

function parseTodo(text: string, laneId: string, order: number): Todo {
  const todo: Todo = {
    id: generateId(),
    text: text,
    laneId,
    tags: [],
    doingPendingHistory: [],
    order
  };

  // Parse deadline @YYYYMMDD
  const deadlineMatch = text.match(/@(\d{8})/);
  if (deadlineMatch) {
    todo.deadline = deadlineMatch[1];
    todo.text = todo.text.replace(deadlineMatch[0], '').trim();
  }

  // Parse deadline time @@hh:mm
  const timeMatch = text.match(/@@(\d{2}:\d{2})/);
  if (timeMatch) {
    todo.deadlineTime = timeMatch[1];
    todo.text = todo.text.replace(timeMatch[0], '').trim();
  }

  // Parse doing/pending history [(YYYYMMDDhhmm,YYYYMMDDhhmm)] or [(YYYYMMDDhhmm,)]
  const historyMatch = text.match(/\[((?:\(\d{12},(?:\d{12})?\),?)+)\]/);
  if (historyMatch) {
    const pairs = historyMatch[1].match(/\(\d{12},(?:\d{12})?\)/g) || [];
    todo.doingPendingHistory = pairs.map(pair => {
      const match = pair.match(/\((\d{12}),(\d{12})?\)/);
      if (match) {
        return {
          doing: match[1],
          pending: match[2] || null
        };
      }
      return { doing: null, pending: null };
    });
    todo.text = todo.text.replace(historyMatch[0], '').trim();
  }

  // Parse reject time !!YYYYMMDDhhmm (must parse before done time)
  const rejectMatch = text.match(/!!(\d{12})/);
  if (rejectMatch) {
    todo.rejectAt = rejectMatch[1];
    todo.text = todo.text.replace(rejectMatch[0], '').trim();
  }

  // Parse done time !YYYYMMDDhhmm
  const doneMatch = text.match(/!(\d{12})/);
  if (doneMatch) {
    todo.doneAt = doneMatch[1];
    todo.text = todo.text.replace(doneMatch[0], '').trim();
  }

  // Parse tags #tag
  const tagMatches = text.match(/#(\S+)/g) || [];
  todo.tags = tagMatches.map(tag => tag.substring(1));
  tagMatches.forEach(tag => {
    todo.text = todo.text.replace(tag, '').trim();
  });

  // Parse type $type
  const typeMatch = text.match(/\$(\S+)/);
  if (typeMatch) {
    todo.type = typeMatch[1];
    todo.text = todo.text.replace(typeMatch[0], '').trim();
  }

  return todo;
}

function parseAutomation(line: string): Automation | null {
  const match = line.match(/^(\S+):(\S+):\[(.*)\]$/);
  if (!match) return null;

  const [, type, lane, todosStr] = match;
  const todos = todosStr.split(',').map(t => t.trim()).filter(t => t);

  return { type, lane, todos };
}

export function generateMarkdown(data: KanbanData): string {
  const lines: string[] = [];

  // Generate lanes and todos
  data.lanes.forEach(lane => {
    lines.push(`## ${lane.name}`);

    lane.todos.forEach(todo => {
      let todoLine = `- [ ] ${todo.text}`;

      // Add metadata
      if (todo.deadline) {
        todoLine += ` @${todo.deadline}`;
      }

      if (todo.deadlineTime) {
        todoLine += ` @@${todo.deadlineTime}`;
      }

      if (todo.doingPendingHistory.length > 0) {
        const history = todo.doingPendingHistory
          .map(h => `(${h.doing || ''},${h.pending || ''})`)
          .join(',');
        todoLine += ` [${history}]`;
      }

      if (todo.doneAt) {
        todoLine += ` !${todo.doneAt}`;
      }

      if (todo.rejectAt) {
        todoLine += ` !!${todo.rejectAt}`;
      }

      if (todo.tags.length > 0) {
        todoLine += ` ${todo.tags.map(tag => `#${tag}`).join(' ')}`;
      }

      if (todo.type) {
        todoLine += ` $${todo.type}`;
      }

      lines.push(todoLine);
    });

    lines.push('');
  });

  // Generate automations
  if (data.automations.length > 0) {
    lines.push('## Automations');
    data.automations.forEach(automation => {
      lines.push(`${automation.type}:${automation.lane}:[${automation.todos.join(', ')}]`);
    });
  }

  return lines.join('\n');
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}