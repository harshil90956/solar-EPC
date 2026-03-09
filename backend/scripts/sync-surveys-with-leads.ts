import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SiteSurveysService } from '../src/modules/survey/services/site-surveys.service';
import { LeadsService } from '../src/modules/leads/services/leads.service';

async function syncSurveysWithLeads() {
  const app = await NestFactory.create(AppModule);
  const siteSurveysService = app.get(SiteSurveysService);
  const leadsService = app.get(LeadsService);

  console.log('🔄 Syncing Site Surveys with Lead Data...\n');

  try {
    // Get all surveys
    const surveys = await siteSurveysService.findAll({});
    console.log(`Found ${surveys.data.length} surveys to sync\n`);

    let updated = 0;
    let failed = 0;

    for (const survey of surveys.data) {
      try {
        // Find the source lead
        const lead = await leadsService.findOne(survey.leadId);
        
        if (!lead) {
          console.log(`⚠️  Lead not found for survey ${survey.surveyId}`);
          failed++;
          continue;
        }

        // Update survey with actual lead data
        const updateData: any = {};
        
        // Only update if lead has actual values
        if (lead.kw && lead.kw > 0) {
          updateData.projectCapacity = `${lead.kw} kW`;
        }
        
        if (lead.city) {
          updateData.city = lead.city;
        }
        
        if (lead.assignedTo) {
          const engineerName = lead.assignedTo.toString();
          updateData.engineer = engineerName;
          updateData.solarConsultant = engineerName;
        }

        // Only update if we have new data
        if (Object.keys(updateData).length > 0) {
          await siteSurveysService.update(survey._id.toString(), updateData);
          console.log(`✅ Updated survey ${survey.surveyId}:`, updateData);
          updated++;
        } else {
          console.log(`⏭️  Skipped survey ${survey.surveyId} - no new data`);
        }
      } catch (error: any) {
        console.log(`❌ Failed to update survey ${survey.surveyId}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Sync Complete:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${surveys.data.length}`);

  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
  }

  await app.close();
  process.exit(0);
}

syncSurveysWithLeads();
