/**
 * Migration Script: Fix Lead Visibility Fields
 * 
 * This script updates existing leads that are missing required fields:
 * - createdBy: Set to the admin user who created it (or system default)
 * - assignedTo: Set to null (unassigned)
 * - tenantId: Set based on context or default tenant
 * 
 * Run this script in MongoDB shell or using a Node.js script with mongoose
 */

const { MongoClient, ObjectId } = require('mongodb');

// Configuration
const MONGO_URI = 'mongodb://localhost:27017/solar'; // Update if needed
const DEFAULT_ADMIN_USER_ID = '69a56c4774018b4d8142c650'; // Replace with actual admin user ID
const DEFAULT_TENANT_ID = '69a56c4774018b4d8142c648'; // Replace with actual tenant ID

async function migrateLeads() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const leadsCollection = db.collection('leads');
    
    // Find all leads missing createdBy field
    const leadsWithoutCreatedBy = await leadsCollection.find({
      createdBy: { $exists: false }
    }).toArray();
    
    console.log(`Found ${leadsWithoutCreatedBy.length} leads without createdBy field`);
    
    if (leadsWithoutCreatedBy.length === 0) {
      console.log('No leads need migration');
      return;
    }
    
    // Update each lead
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const lead of leadsWithoutCreatedBy) {
      try {
        // Determine tenantId - use existing or default
        const tenantId = lead.tenantId || new ObjectId(DEFAULT_TENANT_ID);
        
        // Determine createdBy - try to extract from activities or use default
        let createdBy = new ObjectId(DEFAULT_ADMIN_USER_ID);
        
        // If activities exist, try to find the creator
        if (lead.activities && Array.isArray(lead.activities) && lead.activities.length > 0) {
          const creationActivity = lead.activities.find(a => a.type === 'created');
          if (creationActivity && creationActivity.by) {
            // Try to find user by name/email in the activities
            // For now, use default admin
          }
        }
        
        // Update the lead
        const updateResult = await leadsCollection.updateOne(
          { _id: lead._id },
          {
            $set: {
              createdBy: createdBy,
              tenantId: tenantId,
              assignedTo: lead.assignedTo || null
            }
          }
        );
        
        if (updateResult.modifiedCount === 1) {
          updatedCount++;
          console.log(`✓ Updated lead: ${lead.leadId || lead._id}`);
        }
        
      } catch (err) {
        errorCount++;
        console.error(`✗ Failed to update lead ${lead._id}:`, err.message);
      }
    }
    
    console.log('\n--- Migration Summary ---');
    console.log(`Total leads processed: ${leadsWithoutCreatedBy.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Failed: ${errorCount}`);
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateLeads().catch(console.error);

/**
 * Alternative: Simple MongoDB shell command
 * 
 * Use this in MongoDB shell if you prefer:
 * 
 * // Update all leads missing createdBy
 * db.leads.updateMany(
 *   { createdBy: { $exists: false } },
 *   {
 *     $set: {
 *       createdBy: ObjectId("YOUR_ADMIN_USER_ID_HERE"),
 *       tenantId: ObjectId("YOUR_TENANT_ID_HERE"),
 *       assignedTo: null
 *     }
 *   }
 * );
 * 
 * // Update leads missing tenantId only
 * db.leads.updateMany(
 *   { tenantId: { $exists: false } },
 *   {
 *     $set: {
 *       tenantId: ObjectId("YOUR_TENANT_ID_HERE")
 *     }
 *   }
 * );
 */
