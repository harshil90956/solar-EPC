import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProjectTypeConfig, ProjectTypeConfigDocument } from '../schemas/project-type-config.schema';

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedPerformance?: {
    annualGeneration?: number;
    capacityUtilization?: number;
    performanceRatio?: number;
  };
}

// Price breakdown
export interface PriceBreakdown {
  basePrice: number;
  installationCost: number;
  transportCost: number;
  margin: number;
  subtotal: number;
  gst: number;
  subsidy: number;
  finalPrice: number;
  details: {
    pricePerWatt: number;
    systemSizeKw: number;
    marginPercent: number;
    gstPercent: number;
    subsidyPercent: number;
  };
}

// Design data input
export interface DesignData {
  systemSizeKw: number;
  roofArea: number;
  roofLoad?: number;
  panelCount: number;
  panelType: string;
  inverterType: string;
  inverterCapacity: number;
  dcCapacity: number;
  acCapacity: number;
  location?: {
    latitude: number;
    longitude: number;
    irradiance?: number;
  };
  stringConfig?: {
    panelsPerString: number;
    stringCount: number;
  };
  shading?: {
    hasShading: boolean;
    shadingLoss: number;
  };
}

@Injectable()
export class ProjectTypeService {
  private readonly logger = new Logger(ProjectTypeService.name);

  constructor(
    @InjectModel(ProjectTypeConfig.name) private projectTypeConfigModel: Model<ProjectTypeConfigDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    try { return new Types.ObjectId(id); } catch { return undefined; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────

  async getProjectTypeConfigs(tenantId: string | undefined): Promise<ProjectTypeConfig[]> {
    const tid = this.toObjectId(tenantId);
    return this.projectTypeConfigModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async getProjectTypeConfig(tenantId: string | undefined, typeId: string): Promise<ProjectTypeConfig | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, typeId } : { typeId };
    return this.projectTypeConfigModel.findOne(filter).exec();
  }

  async createProjectTypeConfig(
    tenantId: string | undefined,
    typeId: string,
    config: any,
    userId?: string,
  ): Promise<ProjectTypeConfig> {
    const tid = this.toObjectId(tenantId);
    
    // Check if already exists
    const existing = await this.getProjectTypeConfig(tenantId, typeId);
    if (existing) {
      throw new BadRequestException(`Project type ${typeId} already exists`);
    }

    const newConfig = new this.projectTypeConfigModel({
      typeId,
      tenantId: tid,
      config: this.sanitizeConfig(config),
    });

    const saved = await newConfig.save();
    this.logger.log(`Project type config created: ${typeId} by ${userId}`);
    return saved;
  }

  async updateProjectTypeConfig(
    tenantId: string | undefined,
    typeId: string,
    config: any,
    userId?: string,
  ): Promise<ProjectTypeConfig | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, typeId } : { typeId };

    const doc = await this.projectTypeConfigModel.findOneAndUpdate(
      filter,
      { $set: { config: this.sanitizeConfig(config) } },
      { upsert: true, new: true },
    ).exec();

    this.logger.log(`Project type config updated: ${typeId} by ${userId}`);
    return doc;
  }

  async deleteProjectTypeConfig(
    tenantId: string | undefined,
    typeId: string,
    userId?: string,
  ): Promise<ProjectTypeConfig | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, typeId } : { typeId };

    const doc = await this.projectTypeConfigModel.findOneAndDelete(filter).exec();
    if (doc) {
      this.logger.log(`Project type config deleted: ${typeId} by ${userId}`);
    }
    return doc;
  }

  private sanitizeConfig(config: any): any {
    // Ensure required fields exist with defaults
    return {
      label: config.label || 'Unnamed Type',
      icon: config.icon || 'Building',
      color: config.color || '#64748b',
      
      // Design Rules
      designRules: {
        capacityMin: config.designRules?.capacityMin ?? 1,
        capacityMax: config.designRules?.capacityMax ?? 1000,
        minRoofArea: config.designRules?.minRoofArea ?? 10,
        maxRoofLoad: config.designRules?.maxRoofLoad ?? 15,
        minSolarIrradiance: config.designRules?.minSolarIrradiance ?? 1200,
        allowedPanelTypes: config.designRules?.allowedPanelTypes || ['mono', 'poly', 'bifacial'],
        allowedInverterTypes: config.designRules?.allowedInverterTypes || ['string', 'micro', 'hybrid'],
        defaultStringSize: config.designRules?.defaultStringSize ?? 20,
        maxDcAcRatio: config.designRules?.maxDcAcRatio ?? 1.2,
        shadowTolerance: config.designRules?.shadowTolerance ?? 'moderate',
      },

      // Pricing Model
      pricingModel: {
        basePricePerWatt: config.pricingModel?.basePricePerWatt ?? 50,
        minSystemSizeKw: config.pricingModel?.minSystemSizeKw ?? 1,
        maxSystemSizeKw: config.pricingModel?.maxSystemSizeKw ?? 1000,
        priceTiers: config.pricingModel?.priceTiers || [
          { maxKw: 10, pricePerWatt: 50 },
          { maxKw: 50, pricePerWatt: 45 },
          { maxKw: 100, pricePerWatt: 40 },
          { maxKw: 1000, pricePerWatt: 35 },
        ],
        marginPercent: config.pricingModel?.marginPercent ?? 25,
        installationCostPerKw: config.pricingModel?.installationCostPerKw ?? 15000,
        transportCostPerKm: config.pricingModel?.transportCostPerKm ?? 50,
      },

      // Financials
      financials: {
        gstPercent: config.financials?.gstPercent ?? 18,
        subsidyEligible: config.financials?.subsidyEligible ?? false,
        subsidyPercent: config.financials?.subsidyPercent ?? 40,
        subsidyMaxAmount: config.financials?.subsidyMaxAmount ?? 78000,
        acceleratedDepreciation: config.financials?.acceleratedDepreciation ?? false,
        loanOptions: {
          available: config.financials?.loanOptions?.available ?? false,
          maxTenureYears: config.financials?.loanOptions?.maxTenureYears ?? 5,
          interestRateRange: config.financials?.loanOptions?.interestRateRange ?? [8, 12],
        },
      },

      // Module Visibility
      visibleModules: config.visibleModules || ['dashboard', 'crm', 'projects'],

      // Stages
      stages: config.stages || [
        'lead',
        'site_survey',
        'design',
        'quotation',
        'approval',
        'procurement',
        'installation',
        'commissioning',
        'handover',
      ],

      // Custom Fields
      customFields: config.customFields || [],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Design Validation
  // ─────────────────────────────────────────────────────────────────────────

  async validateDesign(
    tenantId: string | undefined,
    typeId: string,
    designData: DesignData,
  ): Promise<ValidationResult> {
    const configDoc = await this.getProjectTypeConfig(tenantId, typeId);
    if (!configDoc) {
      throw new NotFoundException(`Project type ${typeId} not found`);
    }

    const config = configDoc.config as any;
    const rules = config.designRules;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate system size
    if (designData.systemSizeKw < rules.capacityMin) {
      errors.push(`System size ${designData.systemSizeKw}kW is below minimum ${rules.capacityMin}kW`);
    }
    if (designData.systemSizeKw > rules.capacityMax) {
      errors.push(`System size ${designData.systemSizeKw}kW exceeds maximum ${rules.capacityMax}kW`);
    }

    // Validate roof area
    const minArea = designData.panelCount * 2; // Assume 2 sqm per panel
    if (designData.roofArea < minArea) {
      errors.push(`Roof area ${designData.roofArea}m² is insufficient for ${designData.panelCount} panels (need ~${minArea}m²)`);
    }
    if (designData.roofArea < rules.minRoofArea) {
      errors.push(`Roof area ${designData.roofArea}m² is below minimum ${rules.minRoofArea}m²`);
    }

    // Validate roof load if provided
    if (designData.roofLoad && designData.roofLoad > rules.maxRoofLoad) {
      errors.push(`Roof load ${designData.roofLoad}kg/m² exceeds maximum ${rules.maxRoofLoad}kg/m²`);
    }

    // Validate panel type
    if (!rules.allowedPanelTypes.includes(designData.panelType)) {
      errors.push(`Panel type '${designData.panelType}' not allowed. Allowed: ${rules.allowedPanelTypes.join(', ')}`);
    }

    // Validate inverter type
    if (!rules.allowedInverterTypes.includes(designData.inverterType)) {
      errors.push(`Inverter type '${designData.inverterType}' not allowed. Allowed: ${rules.allowedInverterTypes.join(', ')}`);
    }

    // Validate DC/AC ratio
    const dcAcRatio = designData.dcCapacity / designData.acCapacity;
    if (dcAcRatio > rules.maxDcAcRatio) {
      warnings.push(`DC/AC ratio ${dcAcRatio.toFixed(2)} exceeds recommended ${rules.maxDcAcRatio}`);
    }

    // Validate string configuration
    if (designData.stringConfig) {
      if (designData.stringConfig.panelsPerString > rules.defaultStringSize) {
        warnings.push(`String size ${designData.stringConfig.panelsPerString} exceeds recommended ${rules.defaultStringSize}`);
      }
      
      const expectedStrings = Math.ceil(designData.panelCount / designData.stringConfig.panelsPerString);
      if (designData.stringConfig.stringCount !== expectedStrings) {
        warnings.push(`String count mismatch: configured ${designData.stringConfig.stringCount}, expected ${expectedStrings}`);
      }
    }

    // Validate shading
    if (designData.shading?.hasShading && designData.shading.shadingLoss > 20) {
      warnings.push(`High shading loss (${designData.shading.shadingLoss}%) may significantly impact performance`);
    }

    // Calculate estimated performance
    const estimatedPerformance = this.calculatePerformance(designData, rules);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedPerformance,
    };
  }

  private calculatePerformance(
    designData: DesignData,
    rules: any,
  ): ValidationResult['estimatedPerformance'] {
    const irradiance = designData.location?.irradiance || 1500; // kWh/m²/year
    const systemCapacity = designData.systemSizeKw;
    
    // Basic performance calculation
    const annualGeneration = systemCapacity * irradiance * 0.8; // 80% system efficiency
    const capacityUtilization = (annualGeneration / (systemCapacity * 8760)) * 100;
    const performanceRatio = 0.8; // 80% performance ratio

    return {
      annualGeneration: Math.round(annualGeneration),
      capacityUtilization: Math.round(capacityUtilization * 100) / 100,
      performanceRatio: Math.round(performanceRatio * 100) / 100,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Price Calculation
  // ─────────────────────────────────────────────────────────────────────────

  async calculatePrice(
    tenantId: string | undefined,
    typeId: string,
    systemSizeKw: number,
    options: {
      transportDistanceKm?: number;
      includeGst?: boolean;
      applySubsidy?: boolean;
    } = {},
  ): Promise<PriceBreakdown> {
    const configDoc = await this.getProjectTypeConfig(tenantId, typeId);
    if (!configDoc) {
      throw new NotFoundException(`Project type ${typeId} not found`);
    }

    const config = configDoc.config as any;
    const pricing = config.pricingModel;
    const financials = config.financials;

    // Determine price tier
    let pricePerWatt = pricing.basePricePerWatt;
    for (const tier of pricing.priceTiers) {
      if (systemSizeKw <= tier.maxKw) {
        pricePerWatt = tier.pricePerWatt;
        break;
      }
    }

    // Calculate base price
    const systemSizeWatts = systemSizeKw * 1000;
    const basePrice = systemSizeWatts * pricePerWatt;

    // Calculate installation cost
    const installationCost = systemSizeKw * pricing.installationCostPerKw;

    // Calculate transport cost
    const transportDistance = options.transportDistanceKm || 50;
    const transportCost = transportDistance * pricing.transportCostPerKm;

    // Subtotal before margin
    const subtotal = basePrice + installationCost + transportCost;

    // Apply margin
    const margin = subtotal * (pricing.marginPercent / 100);
    const withMargin = subtotal + margin;

    // Apply GST
    const gst = options.includeGst !== false ? withMargin * (financials.gstPercent / 100) : 0;
    const withGst = withMargin + gst;

    // Apply subsidy if eligible
    let subsidy = 0;
    if (options.applySubsidy !== false && financials.subsidyEligible) {
      const calculatedSubsidy = basePrice * (financials.subsidyPercent / 100);
      subsidy = Math.min(calculatedSubsidy, financials.subsidyMaxAmount || Infinity);
    }

    const finalPrice = withGst - subsidy;

    return {
      basePrice,
      installationCost,
      transportCost,
      margin,
      subtotal,
      gst,
      subsidy,
      finalPrice,
      details: {
        pricePerWatt,
        systemSizeKw,
        marginPercent: pricing.marginPercent,
        gstPercent: financials.gstPercent,
        subsidyPercent: financials.subsidyPercent,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Financial Projections
  // ─────────────────────────────────────────────────────────────────────────

  async calculateFinancialProjections(
    tenantId: string | undefined,
    typeId: string,
    systemSizeKw: number,
    options: {
      electricityRate?: number;
      annualEscalation?: number;
      loanTenureYears?: number;
      loanInterestRate?: number;
      analysisPeriodYears?: number;
    } = {},
  ): Promise<any> {
    const config = await this.getProjectTypeConfig(tenantId, typeId);
    if (!config) {
      throw new NotFoundException(`Project type ${typeId} not found`);
    }

    const { finalPrice } = await this.calculatePrice(tenantId, typeId, systemSizeKw);
    
    // Default parameters
    const electricityRate = options.electricityRate || 8; // INR per unit
    const annualEscalation = options.annualEscalation || 5; // 5% annual increase
    const loanTenure = options.loanTenureYears || 5;
    const loanInterest = options.loanInterestRate || 10;
    const analysisPeriod = options.analysisPeriodYears || 25;

    // Get estimated annual generation
    const irradiance = 1500;
    const annualGeneration = systemSizeKw * irradiance * 0.8;

    // Calculate savings over time
    const yearlySavings: Array<{
      year: number;
      generation: number;
      electricityRate: number;
      savings: number;
      cumulativeSavings: number;
    }> = [];

    let cumulativeSavings = 0;
    let currentRate = electricityRate;

    for (let year = 1; year <= analysisPeriod; year++) {
      const savings = annualGeneration * currentRate;
      cumulativeSavings += savings;

      yearlySavings.push({
        year,
        generation: Math.round(annualGeneration),
        electricityRate: Math.round(currentRate * 100) / 100,
        savings: Math.round(savings),
        cumulativeSavings: Math.round(cumulativeSavings),
      });

      currentRate *= (1 + annualEscalation / 100);
    }

    // Calculate payback period
    const annualSavings = yearlySavings[0]?.savings || 0;
    const simplePaybackYears = finalPrice / annualSavings;

    // Calculate ROI
    const totalSavings = yearlySavings[yearlySavings.length - 1]?.cumulativeSavings || 0;
    const roi = ((totalSavings - finalPrice) / finalPrice) * 100;

    // Calculate loan EMI if applicable
    const loanEMI = this.calculateEMI(finalPrice, loanInterest, loanTenure);

    return {
      initialInvestment: Math.round(finalPrice),
      annualGeneration: Math.round(annualGeneration),
      firstYearSavings: Math.round(annualSavings),
      paybackPeriodYears: Math.round(simplePaybackYears * 10) / 10,
      roi25Years: Math.round(roi * 10) / 10,
      totalSavings25Years: Math.round(totalSavings),
      loanDetails: {
        principal: Math.round(finalPrice),
        interestRate: loanInterest,
        tenureYears: loanTenure,
        emi: Math.round(loanEMI),
        totalInterest: Math.round((loanEMI * loanTenure * 12) - finalPrice),
      },
      yearlyProjections: yearlySavings,
    };
  }

  private calculateEMI(principal: number, ratePerAnnum: number, years: number): number {
    const ratePerMonth = ratePerAnnum / 12 / 100;
    const months = years * 12;
    
    if (ratePerMonth === 0) return principal / months;
    
    const emi = principal * ratePerMonth * Math.pow(1 + ratePerMonth, months) / 
                (Math.pow(1 + ratePerMonth, months) - 1);
    
    return emi;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Default Configs
  // ─────────────────────────────────────────────────────────────────────────

  async createDefaultConfigs(tenantId: string | undefined, userId?: string): Promise<void> {
    const defaults = [
      {
        typeId: 'residential',
        config: {
          label: 'Residential',
          icon: 'Home',
          color: '#f59e0b',
          designRules: {
            capacityMin: 1,
            capacityMax: 10,
            minRoofArea: 10,
            maxRoofLoad: 15,
            allowedPanelTypes: ['mono', 'bifacial'],
            allowedInverterTypes: ['string', 'micro'],
            maxDcAcRatio: 1.2,
          },
          pricingModel: {
            basePricePerWatt: 55,
            priceTiers: [
              { maxKw: 3, pricePerWatt: 55 },
              { maxKw: 5, pricePerWatt: 50 },
              { maxKw: 10, pricePerWatt: 45 },
            ],
          },
          financials: {
            subsidyEligible: true,
            subsidyPercent: 40,
            subsidyMaxAmount: 78000,
          },
        },
      },
      {
        typeId: 'commercial',
        config: {
          label: 'Commercial',
          icon: 'Building2',
          color: '#3b82f6',
          designRules: {
            capacityMin: 10,
            capacityMax: 100,
            minRoofArea: 100,
            maxRoofLoad: 20,
            allowedPanelTypes: ['mono', 'poly', 'bifacial'],
            allowedInverterTypes: ['string', 'hybrid'],
            maxDcAcRatio: 1.3,
          },
          pricingModel: {
            basePricePerWatt: 45,
            priceTiers: [
              { maxKw: 25, pricePerWatt: 45 },
              { maxKw: 50, pricePerWatt: 40 },
              { maxKw: 100, pricePerWatt: 35 },
            ],
          },
          financials: {
            subsidyEligible: false,
            acceleratedDepreciation: true,
          },
        },
      },
      {
        typeId: 'industrial',
        config: {
          label: 'Industrial / Utility',
          icon: 'Factory',
          color: '#8b5cf6',
          designRules: {
            capacityMin: 100,
            capacityMax: 1000,
            minRoofArea: 1000,
            maxRoofLoad: 25,
            allowedPanelTypes: ['poly', 'bifacial'],
            allowedInverterTypes: ['string', 'central'],
            maxDcAcRatio: 1.4,
          },
          pricingModel: {
            basePricePerWatt: 35,
            priceTiers: [
              { maxKw: 250, pricePerWatt: 35 },
              { maxKw: 500, pricePerWatt: 30 },
              { maxKw: 1000, pricePerWatt: 25 },
            ],
          },
          financials: {
            subsidyEligible: false,
            acceleratedDepreciation: true,
          },
        },
      },
    ];

    for (const def of defaults) {
      const existing = await this.getProjectTypeConfig(tenantId, def.typeId);
      if (!existing) {
        await this.createProjectTypeConfig(tenantId, def.typeId, def.config, userId);
      }
    }
  }
}
