const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Initialize database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Create tables
const createTables = `
  -- folders table
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE
  );

  -- notes table
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    folder_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
  );

  -- attachments table
  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    note_id INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
  CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);
  CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at);
  
  CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
  CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
  CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
  CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
  
  CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON attachments(uploaded_at);
  CREATE INDEX IF NOT EXISTS idx_attachments_filename ON attachments(filename);
  
  -- Composite indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_notes_folder_updated ON notes(folder_id, updated_at);
  CREATE INDEX IF NOT EXISTS idx_folders_parent_name ON folders(parent_id, name);
  CREATE INDEX IF NOT EXISTS idx_attachments_note_uploaded ON attachments(note_id, uploaded_at);
`;

// Execute table creation
db.exec(createTables, (err) => {
  if (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  }
  
  // Insert root folder if it doesn't exist
  db.get('SELECT COUNT(*) as count FROM folders WHERE id = 1', (err, row) => {
    if (err) {
      console.error('Error checking root folder:', err);
      process.exit(1);
    }
    
    if (row.count === 0) {
      // Create root folder with ID 1
      db.run('INSERT INTO folders (id, name, parent_id) VALUES (1, ?, ?)', ['Root', null], (err) => {
        if (err) {
          console.error('Error creating root folder:', err);
        } else {
          console.log('Created root folder with ID 1');
          
          // Update any existing folders to have parent_id = 1
          db.run('UPDATE folders SET parent_id = 1 WHERE parent_id IS NULL AND id != 1', (err) => {
            if (err) {
              console.error('Error updating existing folders:', err);
            } else {
              console.log('Updated existing folders to have root as parent');
            }
            
            console.log('Database initialized successfully!');
            console.log('Database file:', dbPath);
            console.log('Uploads directory:', uploadsDir);
            console.log('Indexes created for optimal performance');
            console.log('Root folder structure: All folders now have parent_id = 1');
            
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
              } else {
                console.log('Database connection closed');
              }
            });
          });
        }
      });
    } else {
      console.log('Root folder already exists');
      
      // Update any existing folders to have parent_id = 1
      db.run('UPDATE folders SET parent_id = 1 WHERE parent_id IS NULL AND id != 1', (err) => {
        if (err) {
          console.error('Error updating existing folders:', err);
        } else {
          console.log('Updated existing folders to have root as parent');
        }
        
        console.log('Database initialized successfully!');
        console.log('Database file:', dbPath);
        console.log('Uploads directory:', uploadsDir);
        console.log('Indexes created for optimal performance');
        console.log('Root folder structure: All folders now have parent_id = 1');
        
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
        });
      });
    }
  });
}); 