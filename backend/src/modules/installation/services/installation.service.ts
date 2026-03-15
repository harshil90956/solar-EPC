import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
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
import { CommissioningService } from '../../commissioning/services/commissioning.service';
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
  userId?: string;
  id?: string;
  tenantId: string;
  dataScope: 'ALL' | 'ASSIGNED' | 'NONE';
  role?: string;
}

@Injectable()
export class InstallationService {
  private readonly logger = new Logger(InstallationService.name);
  constructor(
    @InjectModel(Installation.name)
    private installationModel: Model<Installation>,
    @InjectModel(Project.name)
    private projectModel: Model<Project>,
    private commissioningIntegration: CommissioningIntegrationService,
    private commissioningService: CommissioningService,
    private installationTaskService: InstallationTaskService,
  ) {}

  private toObjectId(id: string | Types.ObjectId | undefined): Types.ObjectId | null {
    if (!id) return null;
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
    // Handle tenantId - only convert to ObjectId if it's a valid 24-char hex string
    let tenantId: Types.ObjectId | string | null = null;
    if (userContext.tenantId) {
      if (Types.ObjectId.isValid(userContext.tenantId) && userContext.tenantId.length === 24) {
        tenantId = new Types.ObjectId(userContext.tenantId);
      } else {
        // If tenantId is a string name (like 'solarcorp'), skip tenant filter for now
        // or query by tenant name if schema supports it
        tenantId = userContext.tenantId;
      }
    }
    
    console.log('[INSTALLATION] getInstallations called with tenantId:', userContext.tenantId);
    console.log('[INSTALLATION] Full userContext:', JSON.stringify(userContext));
    console.log('[INSTALLATION] Converted tenantId for query:', tenantId);

    const query: any = {
      isDeleted: { $ne: true },
    };

    // Only apply tenant filter if tenantId is a valid ObjectId (not a string name like 'solarcorp')
    if (tenantId && tenantId instanceof Types.ObjectId) {
      query.tenantId = tenantId;
    }

    // Apply data scope filtering
    if (userContext.dataScope === 'ASSIGNED') {
      // Convert userId to ObjectId for proper database matching
      const rawUserId = userContext.userId || userContext.id;
      console.log('[INSTALLATION] Raw userId from context:', rawUserId);
      const userIdObj = this.toObjectId(rawUserId);
      console.log('[INSTALLATION] Converted userIdObj:', userIdObj);
      
      // Only apply filter if we have a valid userId
      if (userIdObj) {
        // User should see installations where they are assigned OR where they are the technician
        query.$or = [
          { assignedTo: userIdObj },
          { technicianId: userIdObj }
        ];
      }
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

    console.log('[INSTALLATION] Final query with all filters:', JSON.stringify(query));

    let installations = await this.installationModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Manually populate projectId only if it's a valid ObjectId
    const populatedInstallations = await Promise.all(installations.map(async (inst) => {
      if (inst.projectId && Types.ObjectId.isValid(inst.projectId.toString())) {
        const project = await this.projectModel.findById(inst.projectId).select('projectId customerName site systemSize').lean().exec();
        if (project) {
          (inst as any).projectId = project;
        }
      }
      return inst;
    }));

    // Populate technicianId (this is usually a valid ObjectId ref)
    const fullyPopulated = await this.installationModel.populate(populatedInstallations, {
      path: 'technicianId',
      select: 'firstName lastName email'
    });
    
    console.log('[INSTALLATION] Installations found:', fullyPopulated.length);
    
    // Text search if provided
    let result = fullyPopulated;
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      result = fullyPopulated.filter(
        inst => searchRegex.test(inst.customerName) || searchRegex.test(inst.site)
      );
    }

    return result;
  }

  /**
   * Get single installation by ID
   */
  async getInstallationById(id: string, userContext: UserContext): Promise<Installation> {
    const query: any = { _id: this.toObjectId(id), isDeleted: false };
    
    // Note: tenantId filter intentionally omitted to match getInstallations behavior
    // The data scope check (ASSIGNED) handles visibility
    
    const installation = await this.installationModel
      .findOne(query)
      .populate('projectId', 'projectId customerName site systemSize status')
      .populate('technicianId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName email')
      .populate('supervisorId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .exec();
    
    // Debug: Get raw document without populate
    const rawDoc = await this.installationModel.findOne(query).lean().exec();
    console.log('[DEBUG] Raw doc assignedTo:', rawDoc?.assignedTo, 'technicianId:', rawDoc?.technicianId);
    console.log('[DEBUG] Populated assignedTo:', installation?.assignedTo, 'technicianId:', installation?.technicianId);

    if (!installation) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    // Check data scope - use rawDoc for permission check (populate may nullify refs)
    if (userContext.dataScope === 'ASSIGNED') {
      const userId = userContext.userId || userContext.id;
      
      // Use raw document values since populate may return null for missing refs
      const rawAssignedTo = rawDoc?.assignedTo;
      const rawTechnicianId = rawDoc?.technicianId;
      
      // Extract IDs from raw document
      const assignedId = rawAssignedTo?._id?.toString() || rawAssignedTo?.toString();
      const techId = rawTechnicianId?._id?.toString() || rawTechnicianId?.toString();
      
      // User can access if they are assigned OR if they are the technician
      const isAssigned = assignedId === userId;
      const isTechnician = techId === userId;
      
      console.log('[DATA_SCOPE_CHECK]', { userId, assignedId, techId, isAssigned, isTechnician, rawAssignedTo, rawTechnicianId });
      
      if (!isAssigned && !isTechnician) {
        throw new ForbiddenException('You do not have access to this installation');
      }
    }

    return installation;
  }

  /**
   * Helper used when an installation is delivered. Creates a commissioning
   * record with minimal data and sets it to "Pending Assign".
   */
  private async createCommissioningForInstallation(
    installation: Installation,
    userContext: UserContext,
  ) {
    const tenantCode = userContext.tenantId;

    // guard: only once
    if ((installation as any).commissioningCreated) {
      return;
    }

    const dto: any = {
      projectId: installation.projectId ? (typeof installation.projectId === 'string' ? installation.projectId : installation.projectId.toString()) : undefined,
      installationId: installation.installationId,
      date: new Date().toISOString().split('T')[0],
      percentage: 0,
      inverterSerialNo: '',
      panelBatchNo: '',
      status: 'Pending Assign',
    };

    const created = await this.commissioningService.createCommissioning(dto, userContext);

    // mark installation so we don't duplicate in future
    await this.installationModel.updateOne(
      { _id: installation._id },
      { $set: { commissioningCreated: true, commissioningId: created._id } },
    );
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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

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
      // If projectId is a valid mongo ID, convert it, otherwise keep as string (formatted PXXXX)
      projectId: createDto.projectId ? (Types.ObjectId.isValid(createDto.projectId) ? this.toObjectId(createDto.projectId) : createDto.projectId) : undefined,
      dispatchId: createDto.dispatchId ? (Types.ObjectId.isValid(createDto.dispatchId) ? this.toObjectId(createDto.dispatchId) : createDto.dispatchId) : undefined,
      technicianId: this.toObjectId(createDto.technicianId),
      supervisorId: createDto.supervisorId ? this.toObjectId(createDto.supervisorId) : undefined,
    };

    console.log('[INSTALLATION] Creating with data:', JSON.stringify({
      installationId: installationData.installationId,
      projectId: installationData.projectId,
      customerName: installationData.customerName,
      site: installationData.site
    }));

    const installation = new this.installationModel(installationData);
    const saved = await installation.save();
    // log creation event
    await this.logEvent(saved._id.toString(), 'installation_created', userId || undefined, {
      installationId: saved.installationId,
    });
    // if technicianId provided, log assignment event
    if (saved.technicianId) {
      await this.logEvent(saved._id.toString(), 'technician_assigned', userId || undefined, { to: saved.technicianId });
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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');
    
    console.log('[INSTALLATION] Dispatch tenantId:', dispatchData.tenantId);
    console.log('[INSTALLATION] User context tenantId:', userContext.tenantId);
    console.log('[INSTALLATION] Final converted tenantId:', tenantId);

    // Check if installation already exists for this dispatch
    const existingQuery: any = {
      dispatchId: dispatchData.dispatchId, // Use STRING, not ObjectId
      isDeleted: { $ne: true },
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
      technicianId: new Types.ObjectId('000000000000000000000000'), // Placeholder ObjectId (will be replaced on assignment)
      technicianName: 'Not Assigned',
      scheduledDate: new Date(), // Set current date as placeholder
      status: 'Pending Assign',
      progress: 0,
      tasks: defaultTasks,
      notes: `Auto-created from Dispatch ${dispatchData.dispatchId}. Items: ${dispatchData.items}`,
      tenantId: effectiveTenantId,
      createdBy: userId,
      assignedTo: null, // No auto-assignment
    });

    const saved = await installation.save();
    await this.logEvent(saved._id.toString(), 'installation_created', userId || undefined, { dispatchId: dispatchData.dispatchId });

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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    const installation = await this.getInstallationById(id, userContext);

    // log technician/assignment change
    if (updateDto.technicianId && updateDto.technicianId !== installation.technicianId?.toString()) {
      await this.logEvent(id, 'technician_assigned', userId || undefined, { from: installation.technicianId, to: updateDto.technicianId });
    }
    if (updateDto.assignedTo && updateDto.assignedTo !== installation.assignedTo?.toString()) {
      await this.logEvent(id, 'technician_assigned', userId || undefined, { from: installation.assignedTo, to: updateDto.assignedTo });
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

    // Convert ObjectId fields — handle null explicitly to allow unassigning
    if (updateDto.technicianId === null || updateDto.technicianId === '') {
      updateData.technicianId = null;
    } else if (updateDto.technicianId) {
      updateData.technicianId = this.toObjectId(updateDto.technicianId);
    }
    if (updateDto.supervisorId === null || updateDto.supervisorId === '') {
      updateData.supervisorId = null;
    } else if (updateDto.supervisorId) {
      updateData.supervisorId = this.toObjectId(updateDto.supervisorId);
    }
    if (updateDto.assignedTo === null || updateDto.assignedTo === '') {
      updateData.assignedTo = null;
    } else if (updateDto.assignedTo) {
      updateData.assignedTo = this.toObjectId(updateDto.assignedTo);
    }
    if (updateDto.projectId) {
      updateData.projectId = this.toObjectId(updateDto.projectId);
    }

    // Build query — only include tenantId filter when available (Super Admin has null tenantId)
    const updateQuery: any = { _id: this.toObjectId(id), isDeleted: { $ne: true } };
    if (tenantId) updateQuery.tenantId = tenantId;

    const updated = await this.installationModel.findOneAndUpdate(
      updateQuery,
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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

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

    // when delivered, automatically spawn commissioning record
    if (statusDto.status === 'Completed') {
      try {
        await this.createCommissioningForInstallation(updated, userContext);
      } catch (err) {
        this.logger.error('failed to create commissioning for installation', err);
        // do not block the status update if commissioning creation fails
      }
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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    const installation = await this.getInstallationById(id, userContext); // Verify access and get current data

    // validate photo requirement: only if a task is being marked as done (t.done is true)
    const beingMarkedDone = tasksDto.tasks.filter((t, idx) => {
      const prevTask = installation.tasks.find(pt => pt.name === t.name);
      return t.done && (!prevTask || !prevTask.done);
    });

    if (beingMarkedDone.some(t => t.photoRequired)) {
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

    // Auto-complete: if all tasks are done (100%), set status to Completed
    const allTasksDone = tasks.length > 0 && tasks.every(t => t.done);
    const currentStatus = installation.status;
    const newStatus = allTasksDone && currentStatus !== 'Completed' ? 'Completed' : currentStatus;

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), isDeleted: false },
      {
        $set: {
          tasks,
          progress,
          status: newStatus,
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
        await this.logEvent(id, 'task_completed', userId || undefined, { taskName: curr.name });
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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    // Verify access by checking if installation exists and user has permission
    const installation = await this.installationModel.findOne({
      _id: this.toObjectId(id),
      isDeleted: false,
    });

    if (!installation) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    // Check data scope permissions
    if (userContext.dataScope === 'ASSIGNED') {
      const rawAssignedTo = installation.assignedTo?.toString();
      const rawTechnicianId = installation.technicianId?.toString();
      const currentUserId = userContext.userId || userContext.id;
      
      const isAssigned = rawAssignedTo === currentUserId;
      const isTechnician = rawTechnicianId === currentUserId;
      
      if (!isAssigned && !isTechnician) {
        throw new ForbiddenException('You do not have access to this installation');
      }
    }

    const photo = {
      url: photoDto.url,
      key: photoDto.key,
      uploadedAt: new Date(),
      uploadedBy: userId,
      caption: photoDto.caption,
      category: photoDto.category,
    };

    // log photo upload event
    await this.logEvent(id, 'photo_uploaded', userId || undefined, { key: photo.key });

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), isDeleted: false },
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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    const installation = await this.getInstallationById(id, userContext); // Verify access

    // Find the photo to get its task name
    const photo = installation.photos?.find(p => p.key === photoKey);
    const taskName = (photo as any)?.taskName || photo?.caption?.replace('Photo for task: ', '');

    const updateData: any = {
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // If photo is associated with a task, uncheck that task
    let updatedTasks = installation.tasks;
    if (taskName && installation.tasks) {
      updatedTasks = installation.tasks.map(t => 
        t.name === taskName ? { ...t, done: false } : t
      );
      updateData.tasks = updatedTasks;
      updateData.progress = this.calculateProgress(updatedTasks);
      
      // If it was completed, move back to In Progress since a task is now undone
      if (installation.status === 'Completed') {
        updateData.status = 'In Progress';
      }
    }

    const updated = await this.installationModel.findOneAndUpdate(
      { _id: this.toObjectId(id), isDeleted: false },
      {
        $pull: { photos: { key: photoKey } },
        $set: updateData,
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    // log event
    await this.logEvent(id, 'photo_deleted', userId || undefined, { key: photoKey, taskName });

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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

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
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

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
    active: number;
    completed: number;
    delayed: number;
    unassigned: number;
  }> {
    const tenantId = this.toObjectId(userContext.tenantId);

    const query: any = { isDeleted: false };
    if (tenantId) query.tenantId = tenantId;

    if (userContext.dataScope === 'ASSIGNED') {
      const userId = this.toObjectId(userContext.userId || userContext.id);
      if (userId) {
        query.$or = [{ assignedTo: userId }, { technicianId: userId }];
      }
    }

    const [total, active, completed, delayed, unassigned] = await Promise.all([
      this.installationModel.countDocuments(query),
      this.installationModel.countDocuments({ ...query, status: 'In Progress' }),
      this.installationModel.countDocuments({ ...query, status: 'Completed' }),
      this.installationModel.countDocuments({ ...query, status: 'Delayed' }),
      this.installationModel.countDocuments({
        ...query,
        $or: [
          { technicianId: { $exists: false } },
          { technicianId: null },
          { technicianName: 'Not Assigned' },
          { technicianName: 'TBD' }
        ]
      }),
    ]);

    return { total, active, completed, delayed, unassigned };
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

  /**
   * Check overdue installations and mark as Delayed
   * Calculates delay days for each overdue installation
   */
  async checkOverdueInstallations(userContext: UserContext): Promise<{ updated: number; installations: any[] }> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const now = new Date();
    
    // Find installations with dueDate passed but not completed
    const query: any = {
      isDeleted: false,
      status: { $nin: ['Completed', 'Delayed'] },
      dueDate: { $exists: true, $ne: null, $lt: now }
    };
    if (tenantId) query.tenantId = tenantId;
    
    const overdueInstallations = await this.installationModel.find(query).exec();
    const updatedInstallations = [];
    
    for (const installation of overdueInstallations) {
      // Calculate delay days
      const dueDate = new Date(installation.dueDate!);
      const delayDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Update status to Delayed and set delayDays
      installation.status = 'Delayed';
      installation.delayDays = delayDays;
      await installation.save();
      
      updatedInstallations.push({
        id: installation._id,
        installationId: installation.installationId,
        delayDays: delayDays,
        dueDate: installation.dueDate
      });
    }
    
    return {
      updated: updatedInstallations.length,
      installations: updatedInstallations
    };
  }

  /**
   * Check if user is assigned as technician for this installation
   */
  async isAssignedTechnician(id: string, userId: string): Promise<boolean> {
    const installation = await this.installationModel.findById(id).exec();
    if (!installation) return false;
    
    const techId = installation.technicianId?.toString();
    const assignedId = installation.assignedTo?.toString();
    
    return techId === userId || assignedId === userId;
  }
}
