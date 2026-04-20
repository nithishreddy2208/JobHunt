class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
    this.outputs = []; 
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, data) {
    if (!word || typeof word !== 'string') return;

    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    let node = this.root;

    for (const ch of normalized) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }

    node.isEnd = true;

    node.outputs.push(data);
  }

  searchByPrefix(prefix, limit = 10) {
    if (!prefix || typeof prefix !== 'string') return [];

    const normalized = prefix.trim().toLowerCase();
    if (!normalized) return [];

    let node = this.root;

    for (const ch of normalized) {
      const next = node.children.get(ch);
      if (!next) return [];
      node = next;
    }

    const results = [];

    const dfs = (curr) => {
      if (results.length >= limit) return;

      if (curr.isEnd && curr.outputs.length) {
        for (const item of curr.outputs) {
          results.push(item);
          if (results.length >= limit) return;
        }
      }

      for (const child of curr.children.values()) {
        dfs(child);
        if (results.length >= limit) return;
      }
    };

    dfs(node);
    return results;
  }

  clear() {
    this.root = new TrieNode();
  }
}