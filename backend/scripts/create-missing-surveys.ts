import mongoose, { Connection, Schema } from 'mongoose';

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-os';

// Lead Schema
const LeadSchema = new Schema({
  leadId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  city: String,
  state: String,
  statusKey: { type: String, default: 'new' },
  source: String,
  assignedTo: Schema.Types.Mixed,
  kw: Number,
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Survey Schema
const SurveySchema = new Schema({
  surveyId: { type: String, required: true, unique: true },
  leadId: { type: String, required: true },
  clientName: { type: String, required: true },
  city: { type: String, default: 'Unknown' },
  projectCapacity: { type: String, default: 'To be determined' },
  engineer: { type: String, default: 'Unassigned' },
  solarConsultant: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'active', 'complete'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

async function createMissingSurveys() {
  console.log('🔌 Connecting to MongoDB...');
  
  try {
    const conn = await mongoose.createConnection(MONGO_URI).asPromise();
    console.log('✅ Connected to MongoDB\n');

    const LeadModel = conn.model('Lead', LeadSchema);
    const SurveyModel = conn.model('Survey', SurveySchema);

    // Find all leads in 'site_survey' stage
    const siteSurveyLeads = await LeadModel.find({
      statusKey: 'site_survey',
      isDeleted: { $ne: true }
    }).lean();

    console.log(`Found ${siteSurveyLeads.length} leads in Site Survey stage\n`);

    // Get all existing surveys
    const existingSurveys = await SurveyModel.find({}).lean();
    const surveyLeadIds = new Set(existingSurveys.map(s => s.leadId?.toString()));

    console.log(`Existing surveys: ${existingSurveys.length}\n`);

    let created = 0;
    let failed = 0;
    let existing = 0;

    for (const lead of siteSurveyLeads) {
      const leadIdStr = lead._id.toString();
      
      // Check if survey already exists
      if (surveyLeadIds.has(leadIdStr)) {
        console.log(`⏭️  Lead ${lead.leadId} already has a survey`);
        existing++;
        continue;
      }

      try {
        // Generate unique survey ID
        const prefix = 'SVY';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        const surveyId = `${prefix}-${timestamp}-${random}`;

        // Create survey for this lead
        const newSurvey = new SurveyModel({
          surveyId,
          leadId: leadIdStr,
          clientName: lead.name,
          city: lead.city || 'Unknown',
          projectCapacity: lead.kw ? `${lead.kw} kW` : 'To be determined',
          engineer: lead.assignedTo?.toString() || 'Unassigned',
          solarConsultant: lead.assignedTo?.toString() || '',
          status: 'pending',
          notes: 'Auto-created from lead stage'
        });

        await newSurvey.save();
        console.log(`✅ Created survey ${surveyId} for lead ${lead.leadId} (${lead.name})`);
        created++;
      } catch (error: any) {
        console.log(`❌ Failed to create survey for lead ${lead.leadId}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Sync Complete:`);
    console.log(`   Created: ${created}`);
    console.log(`   Already Existed: ${existing}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total Leads: ${siteSurveyLeads.length}`);
    console.log(`   Total Surveys Now: ${existingSurveys.length + created}`);

    await conn.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createMissingSurveys();
