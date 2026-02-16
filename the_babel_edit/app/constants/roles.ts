export const ROLE_USER = 'USER';
export const ROLE_ADMIN = 'ADMIN';
export const ROLE_SUPER_ADMIN = 'SUPER_ADMIN';

export const ALL_ROLES = [ROLE_USER, ROLE_ADMIN, ROLE_SUPER_ADMIN] as const;

export type Role = typeof ALL_ROLES[number];
