import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Schemas
import { AutomationRule, AutomationRuleSchema } from './schemas/automation-rule.schema';
import { AutomationExecution, AutomationExecutionSchema } from './schemas/automation-execution.schema';

// Services
import { AutomationEngineService } from './services/automation-engine.service';
import { ConditionEngine } from './services/condition-engine.service';
import { ActionEngine } from './services/action-engine.service';
import { DAGEngine } from './services/dag-engine.service';
import { RuleMatcherService } from './services/rule-matcher.service';
import { AutomationEventBus } from './services/automation-event-bus.service';
import { AutomationQueueService } from './services/automation-queue.service';
import { AutomationTemplatesService } from './services/automation-templates.service';
import { AutomationMigrationService } from './services/automation-migration.service';
import { AutomationEventEmitter } from './services/automation-event-emitter.service';
import { AutomationWorker } from './workers/automation.worker';

// Controllers
import { AutomationController } from './controllers/automation.controller';

// Import other modules for cross-module actions
import { LeadsModule } from '../leads/leads.module';
import { ProjectsModule } from '../projects/projects.module';
import { SurveyModule } from '../survey/survey.module';
import { QuotationModule } from '../quotation/quotation.module';
import { InventoryModule } from '../inventory/inventory.module';
import { InstallationModule } from '../installation/installation.module';
import { CommissioningModule } from '../commissioning/commissioning.module';
import { FinanceModule } from '../finance/finance.module';
import { ServiceAmcModule } from '../service-amc/service-amc.module';
import { EmailModule } from '../email/email.module';

/**
 * Automation Module
 * Production-grade automation engine for Solar OS
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AutomationRule.name, schema: AutomationRuleSchema },
      { name: AutomationExecution.name, schema: AutomationExecutionSchema },
    ]),
    HttpModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    // Import modules for cross-module action support
    forwardRef(() => LeadsModule),
    forwardRef(() => ProjectsModule),
    forwardRef(() => SurveyModule),
    forwardRef(() => QuotationModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => InstallationModule),
    forwardRef(() => CommissioningModule),
    forwardRef(() => FinanceModule),
    forwardRef(() => ServiceAmcModule),
    forwardRef(() => EmailModule),
  ],
  controllers: [AutomationController],
  providers: [
    // Core Services
    AutomationEngineService,
    ConditionEngine,
    ActionEngine,
    DAGEngine,
    RuleMatcherService,
    AutomationEventBus,
    AutomationQueueService,
    AutomationTemplatesService,
    AutomationMigrationService,
    AutomationEventEmitter,
    // Worker
    AutomationWorker,
  ],
  exports: [
    AutomationEngineService,
    AutomationEventBus,
    RuleMatcherService,
    AutomationTemplatesService,
    AutomationMigrationService,
    AutomationEventEmitter,
  ],
})
export class AutomationModule {}
