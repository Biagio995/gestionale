/** Tenant MAIN della piattaforma — non può aprire ticket di assistenza. */
export const PLATFORM_TENANT_ID = 'a0000000-0000-4000-8000-000000000001';

export function isPlatformTenant(tenantId: string): boolean {
  return tenantId === PLATFORM_TENANT_ID;
}
