import { OrganizationRole } from "./organization";

export type UserRole = "super_admin" | "owner" | "cake_topper_provider";

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[]; // Global roles
  currentOrganizationId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  currentOrganizationId?: string;
  currentOrganizationRole?: OrganizationRole;
}
