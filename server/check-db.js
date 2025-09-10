const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== DATABASE ANALYSIS ===\n');

// Check folders
db.all('SELECT * FROM folders ORDER BY id', (err, folders) => {
  if (err) {
    console.error('Error fetching folders:', err);
  } else {
    console.log('📁 FOLDERS:');
    folders.forEach(folder => {
      console.log(`  ID: ${folder.id}, Name: "${folder.name}", Parent: ${folder.parent_id}`);
    });
    console.log('');
  }
  
  // Check notes with folder info
  db.all(`
    SELECT 
      n.id, 
      n.title, 
      n.folder_id, 
      n.created_at, 
      f.name as folder_name,
      CASE 
        WHEN n.folder_id IS NULL THEN 'NO FOLDER'
        WHEN f.name IS NULL THEN 'INVALID FOLDER'
        ELSE f.name
      END as status
    FROM notes n
    LEFT JOIN folders f ON n.folder_id = f.id
    ORDER BY n.id
  `, (err, notes) => {
    if (err) {
      console.error('Error fetching notes:', err);
    } else {
      console.log('📝 NOTES:');
      notes.forEach(note => {
        console.log(`  ID: ${note.id}, Title: "${note.title}", Folder ID: ${note.folder_id}, Status: ${note.status}`);
      });
      console.log('');
      
      // Summary
      const noFolder = notes.filter(n => n.folder_id === null).length;
      const withFolder = notes.filter(n => n.folder_id !== null).length;
      const invalidFolder = notes.filter(n => n.folder_id !== null && n.folder_name === null).length;
      
      console.log('📊 SUMMARY:');
      console.log(`  Total notes: ${notes.length}`);
      console.log(`  Notes with folders: ${withFolder}`);
      console.log(`  Notes without folders: ${noFolder}`);
      console.log(`  Notes with invalid folder IDs: ${invalidFolder}`);
      console.log('');
    }
    
    // Close database
    db.close();
  });
}); 