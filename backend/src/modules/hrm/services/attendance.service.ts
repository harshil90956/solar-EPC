import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from '../schemas/attendance.schema';
import { CheckInDto, CheckOutDto } from '../dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
  ) {}

  async checkIn(checkInDto: CheckInDto, tenantId?: string): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await this.attendanceModel.findOne({
      employeeId: new Types.ObjectId(checkInDto.employeeId),
      date: today,
      tenantId: tenantId && tenantId !== 'default' ? new Types.ObjectId(tenantId) : undefined,
    });

    if (existingAttendance && existingAttendance.checkIn) {
      throw new BadRequestException('Already checked in for today');
    }

    if (existingAttendance) {
      // Update existing record
      existingAttendance.checkIn = new Date();
      existingAttendance.type = checkInDto.type || existingAttendance.type;
      existingAttendance.location = checkInDto.location || existingAttendance.location;
      existingAttendance.notes = checkInDto.notes || existingAttendance.notes;
      return existingAttendance.save();
    }

    // Create new attendance record
    const attendance = new this.attendanceModel({
      employeeId: new Types.ObjectId(checkInDto.employeeId),
      date: today,
      checkIn: new Date(),
      type: checkInDto.type,
      location: checkInDto.location,
      notes: checkInDto.notes,
      tenantId: tenantId && tenantId !== 'default' ? new Types.ObjectId(tenantId) : undefined,
    });

    return attendance.save();
  }

  async checkOut(checkOutDto: CheckOutDto, tenantId?: string): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceModel.findOne({
      employeeId: new Types.ObjectId(checkOutDto.employeeId),
      date: today,
      tenantId: tenantId && tenantId !== 'default' ? new Types.ObjectId(tenantId) : undefined,
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
    
    if (checkOutDto.notes) {
      attendance.notes = checkOutDto.notes;
    }

    return attendance.save();
  }

  async findAll(employeeId?: string, startDate?: Date, endDate?: Date, tenantId?: string): Promise<Attendance[]> {
    const query: any = {};
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    
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
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId) 
    };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    return this.attendanceModel
      .find(query)
      .sort({ date: -1 })
      .exec();
  }

  async getMonthlySummary(employeeId: string, month: number, year: number, tenantId?: string): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const query: any = {
      employeeId: new Types.ObjectId(employeeId),
      date: { $gte: startDate, $lte: endDate },
    };

    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

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
}
