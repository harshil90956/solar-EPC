export class CreateTenantDto {
  name!: string;
  slug!: string;
  companyName!: string;
  description?: string;
  adminEmail!: string;
  adminName!: string;
  plan?: string;
  limits?: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
  };
  settings?: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    taxId?: string;
  };
}

export class UpdateTenantDto {
  name?: string;
  companyName?: string;
  description?: string;
  adminEmail?: string;
  adminName?: string;
  status?: string;
  plan?: string;
  limits?: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
  };
  settings?: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    taxId?: string;
  };
}
