import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument, AttendanceStatus } from '../schemas/attendance.schema';
import { CheckInDto, CheckOutDto } from '../dto/attendance.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  async checkIn(checkInDto: CheckInDto, tenantId?: string): Promise<Attendance> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await this.attendanceModel.findOne({
      employeeId: new Types.ObjectId(checkInDto.employeeId),
      date: today,
      tenantId: tid,
    });

    if (existingAttendance && existingAttendance.checkIn) {
      throw new BadRequestException('Already checked in for today');
    }

    // Calculate status based on check-in time (Late if after 9:30 AM)
    const now = new Date();
    const checkInTime = new Date();
    const lateThreshold = new Date();
    lateThreshold.setHours(9, 30, 0, 0);
    
    const status = checkInTime > lateThreshold ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    if (existingAttendance) {
      // Update existing record
      existingAttendance.checkIn = now;
      existingAttendance.type = checkInDto.type || existingAttendance.type;
      existingAttendance.location = checkInDto.location || existingAttendance.location;
      existingAttendance.notes = checkInDto.notes || existingAttendance.notes;
      existingAttendance.status = status;
      return existingAttendance.save();
    }

    // Create new attendance record
    const attendance = new this.attendanceModel({
      employeeId: new Types.ObjectId(checkInDto.employeeId),
      date: today,
      checkIn: now,
      status,
      type: checkInDto.type,
      location: checkInDto.location,
      notes: checkInDto.notes,
      tenantId: tid,
    });

    return attendance.save();
  }

  async checkOut(checkOutDto: CheckOutDto, tenantId?: string): Promise<Attendance> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceModel.findOne({
      employeeId: new Types.ObjectId(checkOutDto.employeeId),
      date: today,
      tenantId: tid,
    });

    if (!attendance) {
      throw new NotFoundException('No check-in record found for today');
    }

    if (!attendance.checkIn) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out for today');
    }

    const checkOut = new Date();
    attendance.checkOut = checkOut;
    
    // Calculate total hours
    const checkIn = new Date(attendance.checkIn);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    attendance.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    
    // Auto mark as Half Day if working hours are less than 4 hours
    if (attendance.totalHours < 4) {
      attendance.status = AttendanceStatus.HALF_DAY;
    }
    
    // Check for Early Exit (before 6:00 PM)
    const earlyExitThreshold = new Date();
    earlyExitThreshold.setHours(18, 0, 0, 0);
    attendance.isEarlyExit = checkOut < earlyExitThreshold;
    
    if (checkOutDto.notes) {
      attendance.notes = checkOutDto.notes;
    }

    return attendance.save();
  }

  async findAll(employeeId?: string, startDate?: Date, endDate?: Date, tenantId?: string): Promise<Attendance[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { tenantId: tid };
    
    if (employeeId) {
      query.employeeId = new Types.ObjectId(employeeId);
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = startDate;
      }
      if (endDate) {
        query.date.$lte = endDate;
      }
    }

    return this.attendanceModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .sort({ date: -1 })
      .exec();
  }

  async findByEmployeeId(employeeId: string, tenantId?: string): Promise<Attendance[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId),
      tenantId: tid,
    };

    return this.attendanceModel
      .find(query)
      .sort({ date: -1 })
      .exec();
  }

  async getMonthlySummary(employeeId: string, month: number, year: number, tenantId?: string): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const query: any = {
      employeeId: new Types.ObjectId(employeeId),
      date: { $gte: startDate, $lte: endDate },
      tenantId: tid,
    };

    const attendances = await this.attendanceModel.find(query).exec();

    const totalDays = attendances.length;
    const presentDays = attendances.filter(a => a.checkIn && a.checkOut).length;
    const totalHours = attendances.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const averageHours = presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0;

    return {
      month,
      year,
      totalDays,
      presentDays,
      totalHours,
      averageHours,
    };
  }

  async update(id: string, updateData: Partial<Attendance>, tenantId?: string): Promise<Attendance> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const attendance = await this.attendanceModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true },
    ).exec();

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const result = await this.attendanceModel.deleteOne(query).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Attendance record not found');
    }
  }

  async getTodaySummary(tenantId?: string): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query: any = { date: today, tenantId: tid };

    const attendances = await this.attendanceModel.find(query).exec();
    
    const present = attendances.filter(a => a.checkIn && a.status === AttendanceStatus.PRESENT).length;
    const late = attendances.filter(a => a.checkIn && a.status === AttendanceStatus.LATE).length;
    const halfDay = attendances.filter(a => a.checkIn && a.status === AttendanceStatus.HALF_DAY).length;
    const absent = attendances.filter(a => !a.checkIn).length;
    const checkedOut = attendances.filter(a => a.checkOut).length;

    return {
      date: today,
      total: attendances.length,
      present,
      late,
      halfDay,
      absent,
      checkedOut,
    };
  }
}
