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
import { InstallationTaskService } from '../../settings/services/installation-task.service';

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
    private installationTaskService: InstallationTaskService,
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

  private async logEvent(
    installationId: string,
    eventType: string,
    userId?: Types.ObjectId,
    metadata?: any,
  ) {
    try {
      await this.installationModel.updateOne(
        { _id: this.toObjectId(installationId) },
        {
          $push: {
            events: { eventType, userId, timestamp: new Date(), metadata },
          },
        },
      );
    } catch (e) {
      console.error('[INSTALLATION] failed to log event', e);
    }
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

    // fetch default tasks from settings (ignore any tasks passed by client)
    let tasks = [];
    try {
      const cfg = await this.installationTaskService.getConfig(userContext.tenantId);
      tasks = (cfg.tasks || []).map((t: any) => ({ name: t.name, done: false, photoRequired: !!t.photoRequired }));
    } catch (e) {
      // if settings lookup fails, allow client-provided or empty
      tasks = createDto.tasks || [];
    }

    // Calculate initial progress from tasks
    const progress = this.calculateProgress(tasks);

    const installationData: any = {
      ...createDto,
      installationId,
      tenantId,
      progress,
      tasks,
      createdBy: userId,
      assignedTo: createDto.assignedTo ? this.toObjectId(createDto.assignedTo) : userId,
      projectId: this.toObjectId(createDto.projectId),
      dispatchId: createDto.dispatchId ? this.toObjectId(createDto.dispatchId) : undefined,
      technicianId: this.toObjectId(createDto.technicianId),
      supervisorId: createDto.supervisorId ? this.toObjectId(createDto.supervisorId) : undefined,
    };

    const installation = new this.installationModel(installationData);
    const saved = await installation.save();
    // log creation event
    await this.logEvent(saved._id.toString(), 'installation_created', userId, {
      installationId: saved.installationId,
    });
    // if technicianId provided, log assignment event
    if (saved.technicianId) {
      await this.logEvent(saved._id.toString(), 'technician_assigned', userId, { to: saved.technicianId });
    }
    return saved;
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
    console.log('[INSTALLATION TRIGGERED]', dispatchData.dispatchId);
    
    // Use tenantId from dispatch or fall back to user context tenantId
    const dispatchTenantId = dispatchData.tenantId || userContext.tenantId;
    const tenantId = dispatchTenantId ? this.toObjectId(dispatchTenantId) : null;
    const userId = this.toObjectId(userContext.userId);
    
    console.log('[INSTALLATION] Dispatch tenantId:', dispatchData.tenantId);
    console.log('[INSTALLATION] User context tenantId:', userContext.tenantId);
    console.log('[INSTALLATION] Final converted tenantId:', tenantId);

    // Check if installation already exists for this dispatch
    const existingQuery: any = {
      dispatchId: dispatchData.dispatchId, // Use STRING, not ObjectId
      isDeleted: false,
    };
    if (tenantId) {
      existingQuery.tenantId = tenantId;
    }
    const existing = await this.installationModel.findOne(existingQuery);
    
    console.log('[INSTALLATION] Existing installation check:', existing ? 'Found' : 'Not found');

    if (existing) {
      console.log('[INSTALLATION] Duplicate found - returning existing:', existing._id);
      return existing; // Return existing instead of throwing error
    }

    // Look up the project by its custom projectId string (e.g., "PRJ001")
    const projectQuery: any = {
      projectId: dispatchData.projectId,
      isDeleted: false,
    };
    if (tenantId) {
      projectQuery.tenantId = tenantId;
    }
    
    console.log('[INSTALLATION] Project query:', JSON.stringify(projectQuery));
    
    let project = await this.projectModel.findOne(projectQuery);

    if (!project) {
      console.error(`[INSTALLATION] Project not found with projectId: ${dispatchData.projectId}`);
      console.error(`[INSTALLATION] Query was:`, JSON.stringify(projectQuery));
      
      // Try to find project without tenant filter (Super Admin case)
      project = await this.projectModel.findOne({
        projectId: dispatchData.projectId,
        isDeleted: false,
      });
      
      if (project) {
        console.log('[INSTALLATION] Found project without tenant filter:', project._id.toString());
      } else {
        throw new NotFoundException(`Project with ID ${dispatchData.projectId} not found`);
      }
    }

    console.log('[INSTALLATION] Found project:', project._id.toString());
    console.log('[INSTALLATION] Project tenantId:', project.tenantId);

    // Use project's tenantId as final fallback
    const effectiveTenantId = tenantId || project.tenantId;
    console.log('[INSTALLATION] Effective tenantId for installation:', effectiveTenantId);

    if (!effectiveTenantId) {
      throw new BadRequestException('Cannot create installation: no tenantId available from dispatch, user context, or project');
    }

    const installationId = this.generateInstallationId();

    // Default installation tasks based on settings or legacy defaults
    let defaultTasks = [];
    try {
      const cfg = await this.installationTaskService.getConfig(dispatchTenantId || userContext.tenantId);
      defaultTasks = (cfg.tasks || []).map((t: any) => ({ name: t.name, done: false, photoRequired: !!t.photoRequired }));
    } catch (e) {
      defaultTasks = [
        { name: 'Mounting Structure Installed', done: false },
        { name: 'Panel Mounting (Row 1–5)', done: false },
        { name: 'Panel Mounting (Row 6–10)', done: false },
        { name: 'DC Wiring', done: false },
        { name: 'Inverter Installation', done: false },
        { name: 'AC Wiring & DB', done: false },
        { name: 'Earthing', done: false },
      ];
    }

    const installation = new this.installationModel({
      installationId,
      projectId: project._id, // Use the actual MongoDB ObjectId
      dispatchId: dispatchData.dispatchId, // Use STRING, don't convert to ObjectId
      customerName: dispatchData.customerName,
      site: dispatchData.site,
      technicianId: userId, // Will be reassigned
      technicianName: 'TBD',
      scheduledDate: new Date(), // Will be rescheduled
      status: 'Pending',
      progress: 0,
      tasks: defaultTasks,
      notes: `Auto-created from Dispatch ${dispatchData.dispatchId}. Items: ${dispatchData.items}`,
      tenantId: effectiveTenantId,
      createdBy: userId,
      assignedTo: userId,
    });

    const saved = await installation.save();
    await this.logEvent(saved._id.toString(), 'installation_created', userId, { dispatchId: dispatchData.dispatchId });

    console.log('[INSTALLATION CREATED]', {
      _id: saved._id,
      installationId: saved.installationId,
      dispatchId: saved.dispatchId,
      projectId: saved.projectId,
      status: saved.status,
      tenantId: saved.tenantId,
    });
    return saved;
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

    // log technician/assignment change
    if (updateDto.technicianId && updateDto.technicianId !== installation.technicianId?.toString()) {
      await this.logEvent(id, 'technician_assigned', userId, { from: installation.technicianId, to: updateDto.technicianId });
    }
    if (updateDto.assignedTo && updateDto.assignedTo !== installation.assignedTo?.toString()) {
      await this.logEvent(id, 'technician_assigned', userId, { from: installation.assignedTo, to: updateDto.assignedTo });
    }

    // Recalculate progress if tasks updated
    let progress = installation.progress;
    if (updateDto.tasks) {
      progress = this.calculateProgress(updateDto.tasks);
    }

    const updateData: any = {
      ...updateDto,
      // ignore any manual progress value
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

    // progress is derived automatically from tasks; ignore any attempt to set it via status update

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
      // validation before marking complete
      const installation = await this.installationModel.findOne({
        _id: this.toObjectId(id),
      });
      if (installation) {
        const incomplete = installation.tasks?.some(t => !t.done);
        if (incomplete) {
          throw new BadRequestException('All tasks must be completed before marking installation completed');
        }
        const photoNeeded = installation.tasks?.some(t => t.photoRequired);
        if (photoNeeded && (!installation.photos || installation.photos.length === 0)) {
          throw new BadRequestException('Required photo evidence missing, cannot complete installation');
        }
      }

      updateData.endTime = new Date();
      // Ensure 100% progress when completed
      updateData.progress = 100;
      // Mark all tasks as done
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
      { _id: this.toObjectId(id), isDeleted: false },
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found after update`);
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

    const installation = await this.getInstallationById(id, userContext); // Verify access and get current data

    // validate photo requirement: if any task is being marked done and requires photo, ensure we have at least one photo on the installation
    if (tasksDto.tasks.some(t => t.done && t.photoRequired)) {
      if (!installation.photos || installation.photos.length === 0) {
        throw new BadRequestException('Cannot complete photo‑required task without uploading photo');
      }
    }

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

    // emit events for completed tasks based on diff against prior installation
    for (let i = 0; i < tasks.length; i++) {
      const prev = installation.tasks[i];
      const curr = tasks[i];
      if (!prev?.done && curr.done) {
        await this.logEvent(id, 'task_completed', userId, { taskName: curr.name });
      }
    }

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

    // log photo upload event
    await this.logEvent(id, 'photo_uploaded', userId, { key: photo.key });

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

  /**
   * Returns chronological events for a single installation
   */
  async getTimeline(id: string, userContext: UserContext): Promise<any[]> {
    const inst = await this.getInstallationById(id, userContext);
    return (inst.events || []).sort((a, b) => (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  }

  /**
   * Get calendar events across installations with optional filters
   */
  async getCalendarEvents(
    userContext: UserContext,
    filters: {
      from?: string;
      to?: string;
      technicianId?: string;
      projectId?: string;
      status?: string;
    } = {},
  ): Promise<any[]> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const query: any = { isDeleted: false };
    if (tenantId) query.tenantId = tenantId;
    if (filters.technicianId) query.technicianId = this.toObjectId(filters.technicianId);
    if (filters.projectId) query.projectId = this.toObjectId(filters.projectId);
    if (filters.status) query.status = filters.status;
    if (filters.from || filters.to) {
      query['events.timestamp'] = {};
      if (filters.from) query['events.timestamp'].$gte = new Date(filters.from);
      if (filters.to) query['events.timestamp'].$lte = new Date(filters.to);
    }

    const docs = await this.installationModel.find(query, 'installationId events').exec();
    const events: any[] = [];
    docs.forEach(d => {
      (d.events || []).forEach(evt => {
        const obj = (evt as any).toObject ? (evt as any).toObject() : evt;
        events.push({ installationId: d.installationId, ...obj });
      });
    });
    // sort ascending by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return events;
  }
}
