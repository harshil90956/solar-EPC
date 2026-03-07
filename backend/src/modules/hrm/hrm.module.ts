import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Import SettingsModule for PermissionService
import { SettingsModule } from '../settings/settings.module';

// Schemas
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { Leave, LeaveSchema } from './schemas/leave.schema';
import { Payroll, PayrollSchema } from './schemas/payroll.schema';
import { SalaryIncrement, SalaryIncrementSchema } from './schemas/salary-increment.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { User, UserSchema } from '../../core/auth/schemas/user.schema';

// Services
import { EmployeeService } from './services/employee.service';
import { AttendanceService } from './services/attendance.service';
import { LeaveService } from './services/leave.service';
import { PayrollService } from './services/payroll.service';
import { SalaryIncrementService } from './services/salary-increment.service';
import { DepartmentService } from './services/department.service';

// Controllers
import { EmployeeController } from './controllers/employee.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { LeaveController } from './controllers/leave.controller';
import { PayrollController } from './controllers/payroll.controller';
import { SalaryIncrementController } from './controllers/salary-increment.controller';
import { DepartmentController } from './controllers/department.controller';

@Module({
  imports: [
    // SettingsModule removed to allow public API access
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Leave.name, schema: LeaveSchema },
      { name: Payroll.name, schema: PayrollSchema },
      { name: SalaryIncrement.name, schema: SalaryIncrementSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    EmployeeController,
    AttendanceController,
    LeaveController,
    PayrollController,
    SalaryIncrementController,
    DepartmentController,
  ],
  providers: [
    EmployeeService,
    AttendanceService,
    LeaveService,
    PayrollService,
    SalaryIncrementService,
    DepartmentService,
  ],
  exports: [
    EmployeeService,
    AttendanceService,
    LeaveService,
    PayrollService,
    SalaryIncrementService,
    DepartmentService,
  ],
})
export class HrmModule {}
