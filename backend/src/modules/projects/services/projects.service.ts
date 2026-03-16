import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from '../schemas/project.schema';
import { Tenant, TenantSchema } from '../../../core/tenant/schemas/tenant.schema';
import { Item } from '../../items/schemas/item.schema';
import { Inventory } from '../../inventory/schemas/inventory.schema';
import { InventoryReservation } from '../../inventory/schemas/inventory-reservation.schema';
import { DocumentEntity } from '../../document/schemas/document.schema';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto } from '../dto/project.dto';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntity>,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    // Try to find by code if it's not a valid ObjectId
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  async findAll(tenantCode: string, user?: UserWithVisibility, status?: string, search?: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    
    console.log(`[PROJECTS VISIBILITY] user:`, JSON.stringify(user));
    console.log(`[PROJECTS VISIBILITY] user?.dataScope:`, user?.dataScope);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      console.log(`[PROJECTS VISIBILITY] userId:`, userId);
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        query.assignedTo = objectId;
        console.log(`[PROJECTS VISIBILITY] Applied assignedTo filter - type:`, typeof objectId, `instance:`, objectId instanceof Types.ObjectId, `value:`, objectId);
      }
    } else {
      console.log(`[PROJECTS VISIBILITY] No filter applied - ALL scope or no user`);
    }
    
    console.log(`[PROJECTS VISIBILITY] Final query (stringified):`, JSON.stringify(query));
    console.log(`[PROJECTS VISIBILITY] Query assignedTo type:`, typeof query.assignedTo, `instance:`, query.assignedTo instanceof Types.ObjectId);
    
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const result = await this.projectModel.find(query).sort({ createdAt: -1 }).exec();
    console.log(`[PROJECTS VISIBILITY] Query returned ${result.length} records`);
    return result;
  }

  async findOne(tenantCode: string, projectId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const project = await this.projectModel.findOne({
      tenantId,
      projectId,
      isDeleted: false,
    }).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async create(tenantCode: string, createProjectDto: CreateProjectDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const project = new this.projectModel({
      ...createProjectDto,
      tenantId,
    });

    return project.save();
  }

  async update(tenantCode: string, projectId: string, updateProjectDto: UpdateProjectDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: updateProjectDto },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async updateStatus(
    tenantCode: string,
    projectId: string,
    updateStatusDto: UpdateProjectStatusDto,
    user?: UserWithVisibility,
  ) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    
    // Extract user role and ID from user object
    const userRole = user?.role;
    const userId = user?._id || user?.id;
    
    // Role validation for Cancelled status
    if (updateStatusDto.status === 'Cancelled') {
      const allowedRoles = ['Admin', 'Project Manager'];
      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new UnauthorizedException('Only Admin or Project Manager can cancel a project');
      }
    }
    
    // Build update object dynamically
    const updateData: any = {
      status: updateStatusDto.status,
    };
    
    if (updateStatusDto.progress !== undefined) {
      updateData.progress = updateStatusDto.progress;
    }
    
    if (updateStatusDto.milestones !== undefined) {
      updateData.milestones = updateStatusDto.milestones;
    }
    
    // Handle Cancelled status timestamp and user
    if (updateStatusDto.status === 'Cancelled') {
      updateData.cancelledAt = new Date();
      // Set cancelledBy if provided in DTO or from user
      if (updateStatusDto.cancelledBy) {
        updateData.cancelledBy = updateStatusDto.cancelledBy;
      } else if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        updateData.cancelledBy = objectId;
      }
    }
    
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: updateData },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Handle Cancelled status - return reserved inventory to available stock
    if (updateStatusDto.status === 'Cancelled') {
      await this.returnReservedInventoryToStock(tenantId, projectId);
    }

    return project;
  }

  async remove(tenantCode: string, projectId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return { message: `Project ${projectId} deleted successfully` };
  }

  async restore(tenantCode: string, projectId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId, isDeleted: true },
      { $set: { isDeleted: false } },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found or not deleted`);
    }

    return { message: `Project ${projectId} restored successfully` };
  }

  async getStats(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    
    // Build match conditions for aggregation
    const matchConditions: any = {
      tenantId,
      isDeleted: false,
      status: { $ne: 'Cancelled' }, // Exclude cancelled projects from stats
    };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only include projects explicitly assigned to this user
        matchConditions.assignedTo = objectId;
        console.log(`[PROJECTS STATS VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    }
    
    console.log(`[PROJECTS STATS VISIBILITY] Match conditions:`, JSON.stringify(matchConditions));
    
    const stats = await this.projectModel.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          totalCapacity: { $sum: '$systemSize' },
          avgProgress: { $avg: '$progress' },
          commissioned: {
            $sum: { $cond: [{ $eq: ['$status', 'Commissioned'] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $ne: ['$status', 'Commissioned'] }, 1, 0] },
          },
          totalValue: { $sum: '$value' },
        },
      },
    ]).exec();

    return stats[0] || {
      totalProjects: 0,
      totalCapacity: 0,
      avgProgress: 0,
      commissioned: 0,
      active: 0,
      totalValue: 0,
    };
  }

  async getProjectsByStage(tenantCode: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    return this.projectModel.aggregate([
      {
        $match: {
          tenantId,
          isDeleted: false,
          status: { $ne: 'Cancelled' }, // Exclude cancelled projects
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          capacity: { $sum: '$systemSize' },
        },
      },
    ]).exec();
  }

  async getProjectManagers(tenantCode: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const projects = await this.projectModel
      .find({ tenantId, isDeleted: false })
      .select('pm')
      .distinct('pm')
      .exec();
    return { projectManagers: projects.filter(pm => pm && pm.trim() !== '') };
  }

  /**
   * Create a project from an accepted quotation
   */
  async createFromQuotation(quotationId: string, tenantCode: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    // Step 1: Validate quotation exists
    const quotation = await this.documentModel
      .findOne({
        $or: [{ _id: this.toObjectId(quotationId) }, { documentId: quotationId }],
        tenantId,
        isDeleted: false,
      })
      .exec();

    if (!quotation) {
      throw new NotFoundException(`Quotation with id ${quotationId} not found`);
    }

    // Step 2: Check quotation status is ACCEPTED
    if (quotation.status !== 'accepted') {
      throw new BadRequestException(
        `Quotation status is '${quotation.status}'. Only accepted quotations can be converted to projects`,
      );
    }

    // Step 3: Prevent duplicate project creation
    const existingProject = await this.projectModel
      .findOne({
        tenantId,
        quotationId: this.toObjectId(quotationId),
        isDeleted: false,
      })
      .exec();

    if (existingProject) {
      throw new ConflictException(
        `Project already exists for this quotation (Project ID: ${existingProject.projectId})`,
      );
    }

    // Step 4: Validate items array is not empty
    if (!quotation.items || quotation.items.length === 0) {
      throw new BadRequestException('Quotation has no items. Cannot create project without items');
    }

    // Step 5: Map quotation data to project structure
    const projectData: any = {
      tenantId,
      leadId: quotation.leadId,
      quotationId: this.toObjectId(quotationId),
      customerName: quotation.customerName,
      email: quotation.customerEmail,
      mobileNumber: quotation.customerPhone,
      site: quotation.customerAddress || 'Not specified',
      systemSize: 0, // Will be calculated from items or set manually later
      status: 'Quotation', // Initial status after conversion
      pm: 'TBD', // To be assigned
      startDate: new Date().toISOString().split('T')[0],
      estEndDate: '',
      progress: 0,
      value: quotation.total,
      items: quotation.items.map((item, index) => ({
        itemId: `ITEM-${Date.now()}-${index}`,
        category: this.extractCategoryFromItem(item),
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.total,
      })),
      tax: quotation.taxAmount,
      discount: quotation.discount,
      notes: quotation.notes || '',
      milestones: [],
      materials: [],
    };

    // Step 6: Generate unique projectId
    const projectId = await this.generateProjectId(tenantId);
    projectData.projectId = projectId;

    // Step 7: Create and save project
    const project = new this.projectModel(projectData);
    const savedProject = await project.save();

    return savedProject;
  }

  /**
   * Helper method to extract category from quotation item
   */
  private extractCategoryFromItem(item: any): string {
    // Try to extract category from description or name
    const desc = (item.description || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    if (desc.includes('panel') || name.includes('panel')) return 'panel';
    if (desc.includes('inverter') || name.includes('inverter')) return 'inverter';
    if (desc.includes('battery') || name.includes('battery')) return 'battery';
    if (desc.includes('structure') || name.includes('structure')) return 'structure';
    if (desc.includes('cable') || name.includes('cable')) return 'cable';
    if (desc.includes('accessories') || name.includes('accessories')) return 'accessories';
    if (desc.includes('bos') || name.includes('bos')) return 'bos';
    
    return 'other'; // Default category
  }

  /**
   * Helper method to generate unique project ID
   */
  private async generateProjectId(tenantId: Types.ObjectId): Promise<string> {
    const prefix = 'PRJ';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const projectId = `${prefix}-${timestamp}-${random}`;

    // Ensure uniqueness
    const existing = await this.projectModel.findOne({ projectId }).exec();
    if (existing) {
      return this.generateProjectId(tenantId); // Recursively generate new ID
    }

    return projectId;
  }

  /**
   * Helper method to convert string to ObjectId
   */
  private toObjectId(id: string): Types.ObjectId {
    if (!id) return null as any;
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    // If it's not a valid ObjectId, try to find by documentId/projectId
    return null as any;
  }

  /**
   * Return reserved inventory to available stock when project is cancelled
   */
  private async returnReservedInventoryToStock(tenantId: Types.ObjectId, projectId: string): Promise<void> {
    try {
      // Find all active reservations for this project
      const reservations = await this.reservationModel.find({
        tenantId,
        projectId,
        status: { $in: ['Pending', 'active'] },
      }).exec();

      if (reservations.length === 0) {
        return; // No reservations to return
      }

      // Process each reservation
      for (const reservation of reservations) {
        // Find the inventory item
        const inventoryItem = await this.inventoryModel.findOne({
          tenantId,
          itemId: reservation.itemId,
        }).exec();

        if (inventoryItem) {
          // Decrease reserved quantity and increase available
          const returnQty = reservation.quantity;
          const newReserved = Math.max(0, (inventoryItem.reserved || 0) - returnQty);
          const newAvailable = (inventoryItem.stock || 0) - newReserved;

          await this.inventoryModel.updateOne(
            { _id: inventoryItem._id },
            {
              $set: {
                reserved: newReserved,
                available: newAvailable,
              },
            },
          ).exec();
        }

        // Mark reservation as cancelled
        await this.reservationModel.updateOne(
          { _id: reservation._id },
          { $set: { status: 'Cancelled' } },
        ).exec();
      }
    } catch (error) {
      // Log error but don't fail the project cancellation
      console.error(`[PROJECT CANCEL] Error returning inventory to stock:`, error);
    }
  }
}
