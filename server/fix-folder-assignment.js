const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== FIXING FOLDER ASSIGNMENT ===\n');

// Step 1: Check current state
db.all('SELECT * FROM folders ORDER BY id', (err, folders) => {
  if (err) {
    console.error('Error fetching folders:', err);
    return;
  }
  
  console.log('📁 Available folders:');
  folders.forEach(folder => {
    console.log(`  ID: ${folder.id}, Name: "${folder.name}"`);
  });
  console.log('');

  // Step 2: Check notes without folders
  db.all(`
    SELECT id, title, folder_id, created_at
    FROM notes 
    WHERE folder_id IS NULL
    ORDER BY id
  `, (err, notesWithoutFolder) => {
    if (err) {
      console.error('Error fetching notes:', err);
      return;
    }

    console.log(`📝 Found ${notesWithoutFolder.length} notes without folders:`);
    notesWithoutFolder.forEach(note => {
      console.log(`  ID: ${note.id}, Title: "${note.title}"`);
    });
    console.log('');

    if (notesWithoutFolder.length === 0) {
      console.log('✅ All notes already have folders assigned!');
      db.close();
      return;
    }

    // Step 3: Assign notes to folders based on title/content
    console.log('🔄 Assigning notes to folders...\n');
    
    const assignments = [];
    
    // Auto-assign based on title/content patterns
    notesWithoutFolder.forEach(note => {
      let targetFolderId = null;
      
      // Check if note title contains folder names
      const noteTitle = note.title.toLowerCase();
      const noteContent = (note.content || '').toLowerCase();
      
      for (const folder of folders) {
        const folderName = folder.name.toLowerCase();
        
        // Check if folder name appears in note title or content
        if (noteTitle.includes(folderName) || noteContent.includes(folderName)) {
          targetFolderId = folder.id;
          break;
        }
      }
      
      // If no match found, assign to first available folder (or keep null)
      if (!targetFolderId && folders.length > 0) {
        targetFolderId = folders[0].id; // Assign to first folder as default
      }
      
      if (targetFolderId) {
        assignments.push({ noteId: note.id, folderId: targetFolderId });
      }
    });

    // Step 4: Update the database
    if (assignments.length > 0) {
      console.log('📝 Updating note assignments:');
      
      let completed = 0;
      assignments.forEach(assignment => {
        db.run(
          'UPDATE notes SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [assignment.folderId, assignment.noteId],
          function(err) {
            if (err) {
              console.error(`❌ Error updating note ${assignment.noteId}:`, err);
            } else {
              console.log(`✅ Note ${assignment.noteId} assigned to folder ${assignment.folderId}`);
            }
            
            completed++;
            if (completed === assignments.length) {
              console.log('\n🎉 Folder assignment completed!');
              
              // Step 5: Verify the fix
              db.all(`
                SELECT 
                  n.id, 
                  n.title, 
                  n.folder_id, 
                  f.name as folder_name
                FROM notes n
                LEFT JOIN folders f ON n.folder_id = f.id
                ORDER BY n.id
              `, (err, allNotes) => {
                if (err) {
                  console.error('Error verifying notes:', err);
                } else {
                  console.log('\n📊 Final verification:');
                  allNotes.forEach(note => {
                    const status = note.folder_name ? `✅ ${note.folder_name}` : '❌ No Folder';
                    console.log(`  Note ${note.id}: "${note.title}" → ${status}`);
                  });
                  
                  const withFolder = allNotes.filter(n => n.folder_id !== null).length;
                  const withoutFolder = allNotes.filter(n => n.folder_id === null).length;
                  
                  console.log(`\n📈 Summary: ${withFolder} notes with folders, ${withoutFolder} notes without folders`);
                }
                
                db.close();
              });
            }
          }
        );
      });
    } else {
      console.log('ℹ️ No assignments to make.');
      db.close();
    }
  });
}); 