import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ProjectTypeConfigDocument = ProjectTypeConfig & Document;

@Schema({ timestamps: true })
export class ProjectTypeConfig {
  @Prop({ required: true, unique: true })
  typeId!: string;

  @Prop({ type: Object, required: true })
  config!: {
    // UI
    label: string;
    icon: string;
    color: string;
    
    // Design Rules
    designRules: {
      capacityMin: number;
      capacityMax: number;
      minRoofArea: number;
      maxRoofLoad: number;
      minSolarIrradiance: number;
      allowedPanelTypes: string[];
      allowedInverterTypes: string[];
      defaultStringSize: number;
      maxDcAcRatio: number;
      shadowTolerance: string;
    };

    // Pricing Model
    pricingModel: {
      basePricePerWatt: number;
      minSystemSizeKw: number;
      maxSystemSizeKw: number;
      priceTiers: Array<{ maxKw: number; pricePerWatt: number }>;
      marginPercent: number;
      installationCostPerKw: number;
      transportCostPerKm: number;
    };

    // Financial Configuration
    financials: {
      gstPercent: number;
      subsidyEligible: boolean;
      subsidyPercent: number;
      subsidyMaxAmount: number;
      acceleratedDepreciation: boolean;
      loanOptions: {
        available: boolean;
        maxTenureYears: number;
        interestRateRange: number[];
      };
    };

    // Module Visibility
    visibleModules: string[];

    // Project Stages
    stages: string[];

    // Custom Fields
    customFields: Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
    }>;
  };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const ProjectTypeConfigSchema = SchemaFactory.createForClass(ProjectTypeConfig);
ProjectTypeConfigSchema.index({ typeId: 1, tenantId: 1 }, { unique: true, sparse: true });
