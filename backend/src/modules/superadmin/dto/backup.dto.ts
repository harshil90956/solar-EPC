export class CreateBackupDto {
  type!: string;
  tenantId?: string;
  name!: string;
  description?: string;
}
