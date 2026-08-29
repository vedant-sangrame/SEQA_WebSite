const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../retro_db.json');

// Default initial state (100% clean, no default cards)
const defaultData = {
  workspaces: [],
  sprints: [],
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
        if (!this.data.workspaces) this.data.workspaces = [];
        if (!this.data.sprints) this.data.sprints = [];
        // Keep boards created with older versions accessible in one legacy workspace.
        if (this.data.workspaces.length === 0 && this.data.sprints.length > 0) {
          const legacyWorkspaceId = 'workspace-legacy';
          this.data.workspaces.push({ id: legacyWorkspaceId, name: 'Legacy Board', created_at: new Date().toISOString() });
          ['sprints', 'retro_items', 'action_items', 'invitations', 'members'].forEach((collection) => {
            this.data[collection] = this.data[collection].map((item) => ({ ...item, workspace_id: item.workspace_id || legacyWorkspaceId }));
          });
        }
        // Existing sprints created before ownership was added remain Admin-only to delete.
        this.data.sprints = this.data.sprints.map((sprint) => ({
          ...sprint,
          created_by: sprint.created_by || null,
        }));
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
