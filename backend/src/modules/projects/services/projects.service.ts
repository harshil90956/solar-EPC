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
import { StockMovementService } from '../../inventory/services/stock-movement.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntity>,
    private readonly stockMovementService: StockMovementService,
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
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        query.assignedTo = objectId;
      }
    }
    
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const result = await this.projectModel.find(query).sort({ createdAt: -1 }).exec();
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

    // Normalize status (frontend may send different casing like CANCELLED)
    const incomingStatus = updateStatusDto?.status;
    if (incomingStatus && String(incomingStatus).toLowerCase() === 'cancelled') {
      (updateStatusDto as any).status = 'Cancelled';
    }
    
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
    
    // Cancelled needs to be ATOMIC + IDEMPOTENT because it has financial stock impact
    if (updateStatusDto.status === 'Cancelled') {
      return this.cancelProjectAndRestoreInventory(tenantCode, tenantId, projectId, updateStatusDto, userId);
    }

    // Non-cancel updates (no inventory impact)
    const updateData: any = { status: updateStatusDto.status };

    if (updateStatusDto.progress !== undefined) {
      updateData.progress = updateStatusDto.progress;
    }

    if (updateStatusDto.milestones !== undefined) {
      updateData.milestones = updateStatusDto.milestones;
    }

    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: updateData },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  private async cancelProjectAndRestoreInventory(
    tenantCode: string,
    tenantId: Types.ObjectId,
    projectId: string,
    updateStatusDto: UpdateProjectStatusDto,
    userId?: any,
  ) {
    const session = await this.projectModel.db.startSession();

    try {
      await session.withTransaction(async () => {
        const project = await this.projectModel.findOne({ tenantId, projectId, isDeleted: false }).session(session);
        if (!project) {
          throw new NotFoundException(`Project ${projectId} not found`);
        }

        const updateData: any = { status: 'Cancelled', cancelledAt: new Date() };

        if (updateStatusDto.progress !== undefined) {
          updateData.progress = updateStatusDto.progress;
        }

        if (updateStatusDto.milestones !== undefined) {
          updateData.milestones = updateStatusDto.milestones;
        }

        if (updateStatusDto.cancelledBy) {
          updateData.cancelledBy = updateStatusDto.cancelledBy;
        } else if (userId) {
          const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
            ? new Types.ObjectId(userId)
            : userId;
          updateData.cancelledBy = objectId;
        }

        // Idempotency guard: if inventory already restored, we only update status metadata
        const needsRestore = project.inventoryRestored !== true;

        await this.projectModel.updateOne(
          { _id: project._id },
          { $set: updateData },
          { session },
        );

        if (!needsRestore) {
          return;
        }

        const projectQuery: any[] = [{ projectId: projectId }];
        if (Types.ObjectId.isValid(projectId)) {
          projectQuery.push({ projectId: new Types.ObjectId(projectId) });
        }

        const tenantIdStr = tenantId.toString();
        const reservations = await this.reservationModel.find({
          $and: [
            {
              $or: [
                { tenantId },
                { tenantId: tenantIdStr as any },
              ],
            },
            {
              $or: projectQuery,
            },
          ],
          status: { $nin: ['Cancelled', 'cancelled'] },
        } as any).session(session);

        let missingInventoryCount = 0;

        for (const reservation of reservations) {
          const qty = Number(reservation.quantity || 0);
          if (!qty || qty <= 0) {
            await this.reservationModel.updateOne(
              { _id: reservation._id },
              { $set: { status: 'Cancelled' } },
              { session },
            );
            continue;
          }

          // Inventory is stored in Item collection (not Inventory collection)
          // Item schema: itemId, stock, reserved, tenantId (as string)
          const item = await this.itemModel.findOne({
            itemId: reservation.itemId,
            isDeleted: false,
            $or: [
              { tenantId: tenantIdStr },
              { tenantId: tenantId.toString() },
            ],
          } as any).session(session);

          if (!item) {
            console.warn('PROJECT CANCEL INVENTORY RESTORE - item not found in items collection', {
              projectId,
              itemId: reservation.itemId,
              quantity: qty,
              tenantId: tenantIdStr,
            });

            // Do NOT mark reservation cancelled if we couldn't restore inventory.
            missingInventoryCount += 1;
            continue;
          }

          const before = {
            reserved: item.reserved || 0,
            stock: item.stock || 0,
            available: (item.stock || 0) - (item.reserved || 0),
          };

          // Calculate new values (clamp reserved >= 0, available <= stock)
          const newReserved = Math.max(0, (item.reserved || 0) - qty);
          // available is derived: stock - reserved

          await this.itemModel.updateOne(
            { _id: item._id },
            {
              $set: {
                reserved: newReserved,
              },
            },
            { session },
          );

          const afterItem = await this.itemModel.findById(item._id).session(session);
          const after = {
            reserved: afterItem?.reserved || 0,
            stock: afterItem?.stock || 0,
            available: (afterItem?.stock || 0) - (afterItem?.reserved || 0),
          };

          console.log('PROJECT CANCEL INVENTORY RESTORE', {
            projectId,
            itemId: reservation.itemId,
            quantity: qty,
            before,
            after,
          });

          await this.reservationModel.updateOne(
            { _id: reservation._id },
            { $set: { status: 'Cancelled' } },
            { session },
          );

          // Log stock movement for RELEASE (Cancelled Project)
          try {
            await this.stockMovementService.logMovement(tenantCode, {
              itemId: item._id.toString(),
              type: 'RELEASE',
              quantity: qty,
              reference: projectId,
              referenceType: 'PROJECT',
              note: `Released ${qty} units from cancelled project ${projectId}`,
              warehouseName: item.warehouse || 'Main Warehouse',
            });
          } catch (err) {
            console.error('[STOCK MOVEMENT] Failed to log RELEASE for cancelled project:', err);
          }
        }

        // Only mark inventory restored if every reservation could be applied.
        // If some inventory records were missing, keep it false so you can retry.
        if (missingInventoryCount === 0) {
          await this.projectModel.updateOne(
            { _id: project._id },
            { $set: { inventoryRestored: true, inventoryRestoredAt: new Date() } },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    const updated = await this.projectModel.findOne({ tenantId, projectId, isDeleted: false }).exec();
    if (!updated) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return updated;
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
        matchConditions.assignedTo = objectId;
      }
    }
    
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
          // Include ALL statuses including Cancelled for the graph
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
      systemSize: 0,
      status: 'Quotation',
      pm: 'TBD',
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
      isDeleted: false,
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
    // Build query for both string and ObjectId projectId formats
    const projectQuery: any[] = [{ projectId: projectId }];
    if (Types.ObjectId.isValid(projectId)) {
      projectQuery.push({ projectId: new Types.ObjectId(projectId) });
    }

    // Find all active reservations for this project
    const reservations = await this.reservationModel.find({
      $or: projectQuery,
      status: { $nin: ['Cancelled', 'cancelled'] },
    }).exec();

    if (reservations.length === 0) {
      return;
    }

    // Process each reservation
    for (const reservation of reservations) {
      // Find the inventory item BY ITEMID ONLY - completely ignore tenantId
      const item = await this.inventoryModel.findOne({
        itemId: reservation.itemId,
      }).exec();

      if (item) {
        const newReserved = Math.max(0, item.reserved - reservation.quantity);
        const newAvailable = item.available + reservation.quantity;

        await this.inventoryModel.updateOne(
          { _id: item._id },
          { 
            $set: { 
              reserved: newReserved,
              available: newAvailable
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
  } catch (error: any) {
    // Removed logger.error
  }
}

/**
 * MANUAL FIX: Adjust inventory for INV3552
 */
private async fixStuckInventoryForINV3552(tenantId: Types.ObjectId): Promise<void> {
  try {
    // Find the inventory item BY ITEMID ONLY - no tenant filter
    const inventoryItem = await this.inventoryModel.findOne({
      itemId: 'INV3552'
    }).exec();

    if (!inventoryItem) {
      return;
    }

    if (inventoryItem.reserved > 0) {
      const newReserved = 0;
      const newAvailable = inventoryItem.stock;

      await this.inventoryModel.updateOne(
        { _id: inventoryItem._id },
        { 
          $set: { 
            reserved: newReserved,
            available: newAvailable
          },
        },
      ).exec();
    }
  } catch (error: any) {
    // Removed logger.error
  }
}

/**
 * Force fix for INV3552
 */
async forceFixINV3552(tenantCode: string): Promise<any> {
  try {
    // Find the inventory item BY ITEMID ONLY
    const item = await this.inventoryModel.findOne({
      itemId: 'INV3552',
    }).exec();

    if (!item) {
      return { success: false, message: 'INV3552 not found' };
    }

    const before = {
      reserved: item.reserved,
      available: item.available,
    };

    // FORCE UPDATE: Set reserved to 0, available to stock
    const newReserved = 0;
    const newAvailable = item.stock;
    const clearedQty = item.reserved;

    await this.inventoryModel.updateOne(
      { _id: item._id },
      { 
        $set: { 
          reserved: newReserved,
          available: newAvailable
        },
      },
    ).exec();

    return {
      success: true,
      message: `Fixed INV3552: Cleared ${clearedQty} pcs from reserved`,
      before,
      after: {
        reserved: newReserved,
        available: newAvailable,
      },
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Unknown error' };
  }
}

}
