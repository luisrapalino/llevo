/** Roles en public.profiles (enum user_role). */
export type UserRole = 'admin' | 'staff' | 'customer' | 'driver';

/** Quién puede usar el panel de gestión actual (/panel). */
export type PanelUserRole = 'admin' | 'staff';

export function isPanelUserRole(role: UserRole): role is PanelUserRole {
  return role === 'admin' || role === 'staff';
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'staff':
      return 'Equipo';
    case 'driver':
      return 'Conductor';
    case 'customer':
      return 'Cliente';
    default:
      return role;
  }
}
