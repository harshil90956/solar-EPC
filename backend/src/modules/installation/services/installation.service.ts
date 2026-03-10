import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Installation } from '../schemas/installation.schema';
import { Project } from '../../projects/schemas/project.schema';
import {
  CreateInstallationDto,
  UpdateInstallationDto,
  UpdateInstallationStatusDto,
  UpdateInstallationTasksDto,
  AddPhotoDto,
  QualityCheckDto,
  CustomerSignOffUpdateDto,
} from '../dto/installation.dto';
import { CommissioningIntegrationService } from './commissioning-integration.service';

export interface InstallationQuery {
  tenantId: Types.ObjectId;
  status?: string;
  projectId?: string;
  technicianId?: string;
  assignedTo?: string;
  isDeleted?: boolean;
}

export interface UserContext {
  userId: string;
  tenantId: string;
  dataScope: 'ALL' | 'ASSIGNED' | 'NONE';
  role: string;
}

@Injectable()
export class InstallationService {
  constructor(
    @InjectModel(Installation.name)
    private installationModel: Model<Installation>,
    @InjectModel(Project.name)
    private projectModel: Model<Project>,
    private commissioningIntegration: CommissioningIntegrationService,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (typeof id === 'string') {
      // Check if it's already a valid ObjectId hex string (24 chars)
      if (Types.ObjectId.isValid(id) && id.length === 24) {
        return new Types.ObjectId(id);
      }
      // For string tenantIds like "default", create a deterministic ObjectId
      // by padding/truncating to 24 chars using a hash approach
      const padded = this.stringToObjectIdHex(id);
      return new Types.ObjectId(padded);
    }
    return id;
  }

  private stringToObjectIdHex(str: string): string {
    // Create a deterministic 24-char hex string from any string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and pad to 24 chars
    const hex = Math.abs(hash).toString(16).padStart(24, '0');
    return hex.substring(0, 24);
  }

  private generateInstallationId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `IL${timestamp}${random}`;
  }

  private calculateProgress(tasks: { done: boolean }[]): number {
    if (!tasks || tasks.length === 0) return 0;
    const doneCount = tasks.filter(t => t.done).length;
    return Math.round((doneCount / tasks.length) * 100);
  }

  /**
   * Get all installations with tenant filtering and data scope
   */
  async getInstallations(userContext: UserContext, filters: {
    status?: string;
    projectId?: string;
    technicianId?: string;
    search?: string;
  } = {}): Promise<Installation[]> {
    const tenantId = this.toObjectId(userContext.tenantId);
    
    console.log('[INSTALLATION] getInstallations called with tenantId:', userContext.tenantId);
    console.log('[INSTALLATION] Converted tenantId for query:', tenantId);

    const query: any = {
      isDeleted: false,
    };

    // Only apply tenant filter if tenantId is valid (not null for super admins)
    if (tenantId) {
      query.tenantId = tenantId;
    }
    console.log('[INSTALLATION] Final query:', JSON.stringify(query));

    // Apply data scope filtering
    if (userContext.dataScope === 'ASSIGNED') {
      query.assignedTo = userContext.userId;
    }

    // Apply additional filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.projectId) {
      query.projectId = filters.projectId;
    }
    if (filters.technicianId) {
      query.technicianId = filters.technicianId;
    }

    let installations = await this.installationModel
      .find(query)
      .populate('projectId', 'projectId customerName site systemSize')
      .populate('technicianId', 'firstName lastName email')
      .populate('dispatchId', 'id status deliveredDate')
      .sort({ createdAt: -1 })
      .exec();

    // Debug: Log first installation to check if projectId is populated
    if (installations.length > 0) {
      console.log('[INSTALLATION] First installation projectId:', installations[0].projectId);
    }

    // Text search if provided
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      installations = installations.filter(
        inst => searchRegex.test(inst.customerName) || searchRegex.test(inst.site)
      );
    }

    return installations;
  }

  /**
   * Get single installation by ID
   */
  async getInstallationById(id: string, userContext: UserContext): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    
    const query: any = { _id: this.toObjectId(id), isDeleted: false };
    
    // Only apply tenant filter if tenantId is valid (not null for super admins)
    if (tenantId) {
      query.tenantId = tenantId;
    }
    
    const installation = await this.installationModel
      .findOne(query)
      .populate('projectId', 'projectId customerName site systemSize status')
      .populate('technicianId', 'firstName lastName email phone')
      .populate('supervisorId', 'firstName lastName email')
      .populate('dispatchId', 'id status items deliveredDate')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!installation) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    // Check data scope
    if (userContext.dataScope === 'ASSIGNED') {
      const assignedId = installation.assignedTo?.toString();
      if (assignedId !== userContext.userId) {
        throw new ForbiddenException('You do not have access to this installation');
      }
    }

    return installation;
  }

  /**
   * Get installation by project ID
   */
  async getInstallationByProjectId(projectId: string, userContext: UserContext): Promise<Installation | null> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const projectObjectId = this.toObjectId(projectId);

    const query: any = {
      projectId: projectObjectId,
      isDeleted: false,
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (userContext.dataScope === 'ASSIGNED') {
      query.assignedTo = userContext.userId;
    }

    return this.installationModel
      .findOne(query)
      .populate('technicianId', 'firstName lastName email')
      .exec();
  }

  /**
   * Create new installation
   */
  async createInstallation(
    createDto: CreateInstallationDto,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    // Generate installation ID if not provided
    const installationId = createDto.installationId || this.generateInstallationId();

    // Calculate initial progress from tasks
    const progress = this.calculateProgress(createDto.tasks || []);

    const installationData = {
      ...createDto,
      installationId,
      tenantId,
      progress,
      createdBy: userId,
      assignedTo: createDto.assignedTo ? this.toObjectId(createDto.assignedTo) : userId,
      projectId: this.toObjectId(createDto.projectId),
      dispatchId: createDto.dispatchId ? this.toObjectId(createDto.dispatchId) : undefined,
      technicianId: this.toObjectId(createDto.technicianId),
      supervisorId: createDto.supervisorId ? this.toObjectId(createDto.supervisorId) : undefined,
    };

    const installation = new this.installationModel(installationData);
    return installation.save();
  }

  /**
   * Create installation from dispatch (auto-creation when dispatch is delivered)
   */
  async createInstallationFromDispatch(
    dispatchData: {
      projectId: string;
      dispatchId: string;
      customerName: string;
      site: string;
      tenantId: string;
      items: string;
    },
    userContext: UserContext,
  ): Promise<Installation> {
    console.log('[INSTALLATION] createInstallationFromDispatch called with:', {
      dispatchId: dispatchData.dispatchId,
      tenantId: dispatchData.tenantId,
      projectId: dispatchData.projectId,
    });
    
    const tenantId = dispatchData.tenantId ? this.toObjectId(dispatchData.tenantId) : null;
    const userId = this.toObjectId(userContext.userId);
    
    console.log('[INSTALLATION] Converted tenantId:', tenantId);
    console.log('[INSTALLATION] Converted userId:', userId);

    // Check if installation already exists for this dispatch
    const existingQuery: any = {
      dispatchId: this.toObjectId(dispatchData.dispatchId),
      isDeleted: false,
    };
    if (tenantId) {
      existingQuery.tenantId = tenantId;
    }
    const existing = await this.installationModel.findOne(existingQuery);
    
    console.log('[INSTALLATION] Existing installation check:', existing ? 'Found' : 'Not found');

    if (existing) {
      throw new BadRequestException('Installation already exists for this dispatch');
    }

    // Look up the project by its custom projectId string (e.g., "PRJ001")
    const projectQuery: any = {
      projectId: dispatchData.projectId,
      isDeleted: false,
    };
    if (tenantId) {
      projectQuery.tenantId = tenantId;
    }
    const project = await this.projectModel.findOne(projectQuery);

    if (!project) {
      console.error(`[INSTALLATION] Project not found with projectId: ${dispatchData.projectId}`);
      throw new NotFoundException(`Project with ID ${dispatchData.projectId} not found`);
    }

    console.log('[INSTALLATION] Found project:', project._id.toString());

    const installationId = this.generateInstallationId();

    // Default installation tasks based on solar EPC standards
    const defaultTasks = [
      { name: 'Mounting Structure Installed', done: false },
      { name: 'Panel Mounting (Row 1–5)', done: false },
      { name: 'Panel Mounting (Row 6–10)', done: false },
      { name: 'DC Wiring', done: false },
      { name: 'Inverter Installation', done: false },
      { name: 'AC Wiring & DB', done: false },
      { name: 'Earthing', done: false },
    ];

    const installation = new this.installationModel({
      installationId,
      projectId: project._id, // Use the actual MongoDB ObjectId
      dispatchId: this.toObjectId(dispatchData.dispatchId),
      customerName: dispatchData.customerName,
      site: dispatchData.site,
      technicianId: userId, // Will be reassigned
      technicianName: 'TBD',
      scheduledDate: new Date(), // Will be rescheduled
      status: 'Pending',
      progress: 0,
      tasks: defaultTasks,
      notes: `Auto-created from Dispatch ${dispatchData.dispatchId}. Items: ${dispatchData.items}`,
      tenantId,
      createdBy: userId,
      assignedTo: userId,
    });

    return installation.save();
  }

  /**
   * Update installation
   */
  async updateInstallation(
    id: string,
    updateDto: UpdateInstallationDto,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    const installation = await this.getInstallationById(id, userContext);

    // Recalculate progress if tasks updated
    let progress = installation.progress;
    if (updateDto.tasks) {
      progress = this.calculateProgress(updateDto.tasks);
    }

    const updateData: any = {
      ...updateDto,
      progress,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // Convert ObjectId fields
    if (updateDto.projectId) {
      updateData.projectId = this.toObjectId(updateDto.projectId);
    }
    if (updateDto.technicianId) {
      updateData.technicianId = this.toObjectId(updateDto.technicianId);
    }
    if (updateDto.supervisorId) {
      updateData.supervisorId = this.toObjectId(updateDto.supervisorId);
    }
    if (updateDto.assignedTo) {
      updateData.assignedTo = this.toObjectId(updateDto.assignedTo);
    }

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update installation status
   */
  async updateStatus(
    id: string,
    statusDto: UpdateInstallationStatusDto,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    await this.getInstallationById(id, userContext); // Verify access

    const updateData: any = {
      status: statusDto.status,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    if (statusDto.progress !== undefined) {
      updateData.progress = statusDto.progress;
    }

    // Handle status-specific logic
    if (statusDto.status === 'In Progress' && !updateData.startTime) {
      updateData.startTime = new Date();
    }

    if (statusDto.status === 'Delayed') {
      updateData.delayedAt = new Date();
      if (statusDto.delayReason) {
        updateData.delayReason = statusDto.delayReason;
      }
    }

    if (statusDto.status === 'Completed') {
      updateData.endTime = new Date();
      // Ensure 100% progress when completed
      updateData.progress = 100;
      // Mark all tasks as done
      const installation = await this.installationModel.findOne({
        _id: this.toObjectId(id),
        tenantId,
      });
      if (installation && installation.tasks) {
        updateData.tasks = installation.tasks.map(t => ({
          ...t,
          done: true,
          completedAt: t.completedAt || new Date(),
          completedBy: t.completedBy || userId,
        }));
      }
    }

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update installation tasks
   */
  async updateTasks(
    id: string,
    tasksDto: UpdateInstallationTasksDto,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    await this.getInstallationById(id, userContext); // Verify access

    // Add completed metadata to tasks
    const tasks = tasksDto.tasks.map(task => ({
      ...task,
      completedAt: task.done ? (task.completedAt || new Date()) : undefined,
      completedBy: task.done ? (task.completedBy ? this.toObjectId(task.completedBy) : userId) : undefined,
    }));

    const progress = this.calculateProgress(tasks);

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $set: {
          tasks,
          progress,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Add photo to installation
   */
  async addPhoto(
    id: string,
    photoDto: AddPhotoDto,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    await this.getInstallationById(id, userContext); // Verify access

    const photo = {
      url: photoDto.url,
      key: photoDto.key,
      uploadedAt: new Date(),
      uploadedBy: userId,
      caption: photoDto.caption,
      category: photoDto.category,
    };

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $push: { photos: photo },
        $set: {
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Remove photo from installation
   */
  async removePhoto(
    id: string,
    photoKey: string,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    await this.getInstallationById(id, userContext); // Verify access

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $pull: { photos: { key: photoKey } },
        $set: {
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update quality check
   */
  async updateQualityCheck(
    id: string,
    qualityDto: QualityCheckDto,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    await this.getInstallationById(id, userContext); // Verify access

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $set: {
          qualityCheckPassed: qualityDto.passed,
          qualityCheckNotes: qualityDto.notes,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update customer sign-off
   */
  async updateCustomerSignOff(
    id: string,
    signOffDto: CustomerSignOffUpdateDto,
    userContext: UserContext,
  ): Promise<Installation> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    await this.getInstallationById(id, userContext); // Verify access

    const signOffData = {
      signed: signOffDto.signed,
      signedAt: signOffDto.signed ? new Date() : undefined,
      signatureUrl: signOffDto.signatureUrl,
    };

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $set: {
          customerSignOff: signOffData,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Delete installation (soft delete)
   */
  async deleteInstallation(id: string, userContext: UserContext): Promise<void> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId);

    await this.getInstallationById(id, userContext); // Verify access

    const result = await this.installationModel.updateOne(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }
  }

  /**
   * Get installation statistics for dashboard
   */
  async getStatistics(userContext: UserContext): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    delayed: number;
    completed: number;
    averageProgress: number;
  }> {
    const tenantId = this.toObjectId(userContext.tenantId);

    const query: any = { isDeleted: false };
    if (tenantId) {
      query.tenantId = tenantId;
    }
    
    if (userContext.dataScope === 'ASSIGNED') {
      query.assignedTo = userContext.userId;
    }

    const [
      total,
      pending,
      inProgress,
      delayed,
      completed,
      progressData,
    ] = await Promise.all([
      this.installationModel.countDocuments(query),
      this.installationModel.countDocuments({ ...query, status: 'Pending' }),
      this.installationModel.countDocuments({ ...query, status: 'In Progress' }),
      this.installationModel.countDocuments({ ...query, status: 'Delayed' }),
      this.installationModel.countDocuments({ ...query, status: 'Completed' }),
      this.installationModel.aggregate([
        { $match: { ...query, status: { $in: ['Pending', 'In Progress', 'Delayed'] } } },
        { $group: { _id: null, avgProgress: { $avg: '$progress' } } },
      ]),
    ]);

    const averageProgress = progressData.length > 0 ? Math.round(progressData[0].avgProgress) : 0;

    return {
      total,
      pending,
      inProgress,
      delayed,
      completed,
      averageProgress,
    };
  }
}
