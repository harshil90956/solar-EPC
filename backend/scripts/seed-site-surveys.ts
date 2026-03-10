import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SiteSurveysService } from '../src/modules/survey/services/site-surveys.service';

async function seedSiteSurveys() {
  const app = await NestFactory.create(AppModule);
  const siteSurveysService = app.get(SiteSurveysService);

  console.log('🌱 Seeding Site Surveys...\n');

  // Sample surveys data
  const sampleSurveys = [
    {
      leadId: 'LEAD-TEST-001',
      clientName: 'Ezekiel Cole',
      city: 'Ahmedabad',
      projectCapacity: '50 kW',
      engineer: 'Rajesh Patel'
    },
    {
      leadId: 'LEAD-TEST-002',
      clientName: 'Priya Sharma',
      city: 'Mumbai',
      projectCapacity: '100 kW',
      engineer: 'Amit Kumar'
    },
    {
      leadId: 'LEAD-TEST-003',
      clientName: 'Rahul Gupta',
      city: 'Delhi',
      projectCapacity: '25 kW',
      engineer: 'Suresh Verma'
    }
  ];

  try {
    for (const surveyData of sampleSurveys) {
      try {
        const survey = await siteSurveysService.createFromLead(surveyData);
        console.log(`✅ Created survey: ${survey.surveyId} - ${survey.clientName} (${survey.status})`);
      } catch (error) {
        console.log(`⚠️  Skipped ${surveyData.clientName} - may already exist`);
      }
    }

    // Get stats
    const stats = await siteSurveysService.getStats();
    console.log('\n📊 Current Stats:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Complete: ${stats.complete}`);

    console.log('\n✨ Seed completed successfully!');
  } catch (error: any) {
    console.error('❌ Seed failed:', error.message);
  }

  await app.close();
  process.exit(0);
}

seedSiteSurveys();
