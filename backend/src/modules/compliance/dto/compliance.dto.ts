import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min } from 'class-validator';

// ==================== NET METERING DTOs ====================

export class CreateNetMeteringDto {
  @IsString()
  applicationId!: string;

  @IsString()
  projectId!: string;

  @IsString()
  customer!: string;

  @IsString()
  site!: string;

  @IsString()
  systemSize!: string;

  @IsString()
  discom!: string;

  @IsOptional()
  @IsString()
  applicationNo?: string;

  @IsOptional()
  @IsString()
  appliedDate?: string;

  @IsOptional()
  @IsString()
  approvalDate?: string;

  @IsOptional()
  @IsEnum(['Draft', 'Applied', 'Approved', 'Rejected', 'Connected'])
  status?: string;

  @IsOptional()
  @IsString()
  compensationRate?: string;

  @IsOptional()
  @IsBoolean()
  bidirectionalMeter?: boolean;

  @IsOptional()
  @IsString()
  discomOfficer?: string;

  @IsOptional()
  @IsString()
  discomPhone?: string;

  @IsOptional()
  @IsString()
  meterInstallationDate?: string;

  @IsOptional()
  @IsString()
  connectionDate?: string;
}

export class UpdateNetMeteringDto {
  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  site?: string;

  @IsOptional()
  @IsString()
  systemSize?: string;

  @IsOptional()
  @IsString()
  discom?: string;

  @IsOptional()
  @IsString()
  applicationNo?: string;

  @IsOptional()
  @IsString()
  appliedDate?: string;

  @IsOptional()
  @IsString()
  approvalDate?: string;

  @IsOptional()
  @IsEnum(['Draft', 'Applied', 'Approved', 'Rejected', 'Connected'])
  status?: string;

  @IsOptional()
  @IsString()
  compensationRate?: string;

  @IsOptional()
  @IsBoolean()
  bidirectionalMeter?: boolean;

  @IsOptional()
  @IsString()
  discomOfficer?: string;

  @IsOptional()
  @IsString()
  discomPhone?: string;

  @IsOptional()
  @IsString()
  meterInstallationDate?: string;

  @IsOptional()
  @IsString()
  connectionDate?: string;
}

// ==================== SUBSIDY DTOs ====================

export class CreateSubsidyDto {
  @IsString()
  subsidyId!: string;

  @IsString()
  projectId!: string;

  @IsString()
  customer!: string;

  @IsString()
  systemSize!: string;

  @IsString()
  scheme!: string;

  @IsOptional()
  @IsString()
  appliedDate?: string;

  @IsOptional()
  @IsString()
  sanctionDate?: string;

  @IsOptional()
  @IsString()
  disbursedDate?: string;

  @IsNumber()
  @Min(0)
  claimAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sanctionedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  disbursedAmount?: number;

  @IsOptional()
  @IsEnum(['Applied', 'Sanctioned', 'Disbursed', 'Rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  applicationRef?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateSubsidyDto {
  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  systemSize?: string;

  @IsOptional()
  @IsString()
  scheme?: string;

  @IsOptional()
  @IsString()
  appliedDate?: string;

  @IsOptional()
  @IsString()
  sanctionDate?: string;

  @IsOptional()
  @IsString()
  disbursedDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  claimAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sanctionedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  disbursedAmount?: number;

  @IsOptional()
  @IsEnum(['Applied', 'Sanctioned', 'Disbursed', 'Rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  applicationRef?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

// ==================== INSPECTION DTOs ====================

export class CreateInspectionDto {
  @IsString()
  inspectionId!: string;

  @IsString()
  projectId!: string;

  @IsString()
  customer!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  completedDate?: string;

  @IsOptional()
  @IsEnum(['Pending', 'Scheduled', 'Passed', 'Failed'])
  status?: string;

  @IsString()
  inspector!: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  nextInspectionDate?: string;

  @IsOptional()
  checklistItems?: string[];

  @IsOptional()
  documentsRequired?: string[];
}

export class UpdateInspectionDto {
  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  completedDate?: string;

  @IsOptional()
  @IsEnum(['Pending', 'Scheduled', 'Passed', 'Failed'])
  status?: string;

  @IsOptional()
  @IsString()
  inspector?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  nextInspectionDate?: string;

  @IsOptional()
  checklistItems?: string[];

  @IsOptional()
  documentsRequired?: string[];

  @IsOptional()
  @IsString()
  inspectionReportUrl?: string;
}

// ==================== COMPLIANCE DOCUMENT DTOs ====================

export class CreateComplianceDocumentDto {
  @IsString()
  documentId!: string;

  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsEnum(['Uploaded', 'Pending', 'Rejected'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  uploadedAt?: string;

  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  previousVersionId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateComplianceDocumentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['Uploaded', 'Pending', 'Rejected'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  uploadedAt?: string;

  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
