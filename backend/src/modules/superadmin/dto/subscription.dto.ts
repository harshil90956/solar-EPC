export class CreateSubscriptionDto {
  tenantId!: string;
  plan!: string;
  billingCycle?: string;
  startDate!: Date;
  endDate!: Date;
  price?: number;
  currency?: string;
  features?: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
    apiAccess: boolean;
    customDomain: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  autoRenew?: boolean;
}

export class UpdateSubscriptionDto {
  plan?: string;
  billingCycle?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  price?: number;
  currency?: string;
  features?: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
    apiAccess: boolean;
    customDomain: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  autoRenew?: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
}
