const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== CLEANING UP FOLDER NAMES ===\n');

// Check current folders
db.all('SELECT * FROM folders ORDER BY id', (err, folders) => {
  if (err) {
    console.error('Error fetching folders:', err);
    return;
  }
  
  console.log('📁 Current folders:');
  folders.forEach(folder => {
    console.log(`  ID: ${folder.id}, Name: "${folder.name}", Parent: ${folder.parent_id}`);
  });
  console.log('');

  // Find duplicate names
  const nameCounts = {};
  folders.forEach(folder => {
    nameCounts[folder.name] = (nameCounts[folder.name] || 0) + 1;
  });

  const duplicates = Object.entries(nameCounts).filter(([name, count]) => count > 1);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate folder names found!');
    db.close();
    return;
  }

  console.log('🔄 Found duplicate folder names:');
  duplicates.forEach(([name, count]) => {
    console.log(`  "${name}": ${count} instances`);
  });
  console.log('');

  // Fix duplicate names
  console.log('🛠️ Fixing duplicate names...\n');
  
  let completed = 0;
  const totalDuplicates = duplicates.reduce((sum, [name, count]) => sum + count - 1, 0);
  
  duplicates.forEach(([name, count]) => {
    // Get all folders with this name
    db.all('SELECT * FROM folders WHERE name = ? ORDER BY id', [name], (err, sameNameFolders) => {
      if (err) {
        console.error(`Error fetching folders with name "${name}":`, err);
        return;
      }
      
      // Keep the first one, rename the rest
      for (let i = 1; i < sameNameFolders.length; i++) {
        const folder = sameNameFolders[i];
        const newName = `${name} ${i + 1}`;
        
        db.run(
          'UPDATE folders SET name = ? WHERE id = ?',
          [newName, folder.id],
          function(err) {
            if (err) {
              console.error(`❌ Error renaming folder ${folder.id}:`, err);
            } else {
              console.log(`✅ Renamed folder ${folder.id}: "${name}" → "${newName}"`);
            }
            
            completed++;
            if (completed === totalDuplicates) {
              console.log('\n🎉 Folder cleanup completed!');
              
              // Show final state
              db.all('SELECT * FROM folders ORDER BY id', (err, finalFolders) => {
                if (err) {
                  console.error('Error fetching final folders:', err);
                } else {
                  console.log('\n📁 Final folder list:');
                  finalFolders.forEach(folder => {
                    console.log(`  ID: ${folder.id}, Name: "${folder.name}", Parent: ${folder.parent_id}`);
                  });
                }
                
                db.close();
              });
            }
          }
        );
      }
    });
  });
}); 