import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateProjectTypeDto {
  @IsString()
  typeId!: string;

  @IsObject()
  config!: {
    label?: string;
    icon?: string;
    color?: string;
    designRules?: {
      capacityMin?: number;
      capacityMax?: number;
      minRoofArea?: number;
      maxRoofLoad?: number;
      minSolarIrradiance?: number;
      allowedPanelTypes?: string[];
      allowedInverterTypes?: string[];
      defaultStringSize?: number;
      maxDcAcRatio?: number;
      shadowTolerance?: string;
    };
    pricingModel?: {
      basePricePerWatt?: number;
      minSystemSizeKw?: number;
      maxSystemSizeKw?: number;
      priceTiers?: Array<{ maxKw: number; pricePerWatt: number }>;
      marginPercent?: number;
      installationCostPerKw?: number;
      transportCostPerKm?: number;
    };
    financials?: {
      gstPercent?: number;
      subsidyEligible?: boolean;
      subsidyPercent?: number;
      subsidyMaxAmount?: number;
      acceleratedDepreciation?: boolean;
      loanOptions?: {
        available?: boolean;
        maxTenureYears?: number;
        interestRateRange?: number[];
      };
    };
    visibleModules?: string[];
    stages?: string[];
    customFields?: Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
    }>;
  };
}

export class UpdateProjectTypeDto {
  @IsOptional()
  @IsObject()
  config?: {
    label?: string;
    icon?: string;
    color?: string;
    designRules?: {
      capacityMin?: number;
      capacityMax?: number;
      minRoofArea?: number;
      maxRoofLoad?: number;
      minSolarIrradiance?: number;
      allowedPanelTypes?: string[];
      allowedInverterTypes?: string[];
      defaultStringSize?: number;
      maxDcAcRatio?: number;
      shadowTolerance?: string;
    };
    pricingModel?: {
      basePricePerWatt?: number;
      minSystemSizeKw?: number;
      maxSystemSizeKw?: number;
      priceTiers?: Array<{ maxKw: number; pricePerWatt: number }>;
      marginPercent?: number;
      installationCostPerKw?: number;
      transportCostPerKm?: number;
    };
    financials?: {
      gstPercent?: number;
      subsidyEligible?: boolean;
      subsidyPercent?: number;
      subsidyMaxAmount?: number;
      acceleratedDepreciation?: boolean;
      loanOptions?: {
        available?: boolean;
        maxTenureYears?: number;
        interestRateRange?: number[];
      };
    };
    visibleModules?: string[];
    stages?: string[];
    customFields?: Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
    }>;
  };
}

export class ValidateDesignDto {
  @IsNumber()
  systemSizeKw!: number;

  @IsNumber()
  roofArea!: number;

  @IsOptional()
  @IsNumber()
  roofLoad?: number;

  @IsNumber()
  panelCount!: number;

  @IsString()
  panelType!: string;

  @IsString()
  inverterType!: string;

  @IsNumber()
  inverterCapacity!: number;

  @IsNumber()
  dcCapacity!: number;

  @IsNumber()
  acCapacity!: number;

  @IsOptional()
  @IsObject()
  location?: {
    latitude: number;
    longitude: number;
    irradiance?: number;
  };

  @IsOptional()
  @IsObject()
  stringConfig?: {
    panelsPerString: number;
    stringCount: number;
  };

  @IsOptional()
  @IsObject()
  shading?: {
    hasShading: boolean;
    shadingLoss: number;
  };
}

export class CalculatePriceDto {
  @IsNumber()
  systemSizeKw!: number;

  @IsOptional()
  @IsNumber()
  transportDistanceKm?: number;

  @IsOptional()
  @IsBoolean()
  includeGst?: boolean;

  @IsOptional()
  @IsBoolean()
  applySubsidy?: boolean;
}

export class FinancialProjectionsDto {
  @IsNumber()
  systemSizeKw!: number;

  @IsOptional()
  @IsNumber()
  electricityRate?: number;

  @IsOptional()
  @IsNumber()
  annualEscalation?: number;

  @IsOptional()
  @IsNumber()
  loanTenureYears?: number;

  @IsOptional()
  @IsNumber()
  loanInterestRate?: number;

  @IsOptional()
  @IsNumber()
  analysisPeriodYears?: number;
}
