import type { Role } from '@/lib/types/database';

export function canSeePurchasePrice(role: Role): boolean {
  return role === 'ADMINISTRADOR' || role === 'NIVEL_2';
}

export function canManageQuotes(role: Role): boolean {
  return role === 'ADMINISTRADOR' || role === 'NIVEL_2';
}

export function canDeleteQuotes(role: Role): boolean {
  return role === 'ADMINISTRADOR';
}

export function canCreateProducts(role: Role): boolean {
  return role === 'ADMINISTRADOR' || role === 'NIVEL_2';
}

export function canUpdateProducts(role: Role): boolean {
  return role === 'ADMINISTRADOR';
}

export function canRegisterAbonos(role: Role): boolean {
  return role === 'ADMINISTRADOR' || role === 'NIVEL_2' || role === 'NIVEL_3';
}

export function canCloseQuotes(role: Role): boolean {
  return role === 'ADMINISTRADOR' || role === 'NIVEL_2';
}

export function canManageClients(role: Role): boolean {
  return role === 'ADMINISTRADOR' || role === 'NIVEL_2';
}

export function canDeleteAbonos(role: Role): boolean {
  return role === 'ADMINISTRADOR';
}

export function canModifyAbono(role: Role, ownerId: string, userId: string): boolean {
  return role === 'ADMINISTRADOR' || (role === 'NIVEL_3' && ownerId === userId);
}
