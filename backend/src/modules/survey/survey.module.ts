import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SurveysController } from './controllers/surveys.controller';
import { SurveysService } from './services/surveys.service';
import { Survey, SurveySchema } from './schemas/survey.schema';
import { SiteSurveysController } from './controllers/site-surveys.controller';
import { SiteSurveysService } from './services/site-surveys.service';
import { Survey as SiteSurvey, SurveySchema as SiteSurveySchema } from './schemas/site-survey.schema';
import { LeadsModule } from '../leads/leads.module';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Survey.name, schema: SurveySchema },
      { name: SiteSurvey.name, schema: SiteSurveySchema },
      { name: Lead.name, schema: LeadSchema },
    ]),
    SettingsModule,
    forwardRef(() => LeadsModule),
  ],
  controllers: [SurveysController, SiteSurveysController],
  providers: [SurveysService, SiteSurveysService],
  exports: [SurveysService, SiteSurveysService],
})
export class SurveyModule {}

