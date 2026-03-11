import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { BackupService } from '../services/backup.service';
import { CreateBackupDto } from '../dto/backup.dto';

@Controller('superadmin/backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.backupService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.backupService.getStats();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.backupService.findById(id);
  }

  @Post()
  async create(@Body() createBackupDto: CreateBackupDto) {
    // TODO: Get actual user from request
    const createdBy = 'Super Admin';
    return this.backupService.create(createBackupDto, createdBy);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('metadata') metadata?: any,
  ) {
    return this.backupService.updateStatus(id, status, metadata);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.backupService.delete(id);
  }
}
