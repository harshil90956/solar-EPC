import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { AmcContract, AmcContractSchema } from './schemas/amc-contract.schema';
import { Visit, VisitSchema } from './schemas/visit.schema';
import { User, UserSchema } from '../../core/auth/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { TicketsService } from './services/tickets.service';
import { AmcContractsService } from './services/amc-contracts.service';
import { VisitsService } from './services/visits.service';
import { ServiceAmcController } from './controllers/service-amc.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: AmcContract.name, schema: AmcContractSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [ServiceAmcController],
  providers: [TicketsService, AmcContractsService, VisitsService],
  exports: [TicketsService, AmcContractsService, VisitsService],
})
export class ServiceAmcModule {}
