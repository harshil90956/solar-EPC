/**
 * Migration: Add inventoryRestored field to existing projects
 * 
 * This script adds the inventoryRestored boolean field to all existing projects
 * to support idempotent inventory restoration when projects are cancelled.
 * 
 * Usage:
 *   node migrations/add-inventory-restored-field.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-erp';

async function migrate() {
  console.log('[MIGRATION] Starting inventoryRestored field migration...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection;
    
    // Get projects collection
    const projectsCollection = db.collection('projects');
    
    // Count total projects
    const totalProjects = await projectsCollection.countDocuments({});
    console.log(`📊 Total projects found: ${totalProjects}\n`);
    
    // Update all projects that don't have the field
    const updateResult = await projectsCollection.updateMany(
      { inventoryRestored: { $exists: false } },
      { $set: { inventoryRestored: false } }
    );
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📈 Results:');
    console.log(`   - Modified: ${updateResult.modifiedCount} projects`);
    console.log(`   - Skipped: ${totalProjects - updateResult.modifiedCount} projects (already had field)`);
    console.log(`   - Matched: ${updateResult.matchedCount} projects\n`);
    
    // Verify by sampling
    const sampleProject = await projectsCollection.findOne({ inventoryRestored: false });
    if (sampleProject) {
      console.log('📋 Sample project with new field:');
      console.log(JSON.stringify({
        projectId: sampleProject.projectId,
        inventoryRestored: sampleProject.inventoryRestored,
        status: sampleProject.status,
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n✅ Migration script finished');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = migrate;
