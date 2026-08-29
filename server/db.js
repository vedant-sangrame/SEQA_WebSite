const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../retro_db.json');

// Default initial state (100% clean, no default cards)
const defaultData = {
  sprints: [
    {
      id: 'sprint-1',
      name: 'Sprint 1 - Retrospective',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
  ],
  retro_items: [],
  action_items: [],
  invitations: [],
  members: [], // { email, name, role, joined_at }
};

// Data Store Class
class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = defaultData;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(fileContent);
        // Ensure array structures exist
        if (!this.data.retro_items) this.data.retro_items = [];
        if (!this.data.action_items) this.data.action_items = [];
        if (!this.data.invitations) this.data.invitations = [];
        if (!this.data.members) this.data.members = [];
        console.log(`Loaded JSON database from: ${this.filePath}`);
      } else {
        this.save();
        console.log(`Initialized new JSON database at: ${this.filePath}`);
      }
    } catch (err) {
      console.error('Error loading database file, initializing default data:', err);
      this.data = defaultData;
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }
}

const dbInstance = new JsonDatabase(dbPath);

module.exports = dbInstance;
