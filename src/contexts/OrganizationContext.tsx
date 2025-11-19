import React, { createContext, useContext, useState, useEffect } from "react";
import type { OrganizationWithRole, OrganizationMember, Organization } from "@/types/organization";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { organizationsApi } from "@/lib/api";

interface OrganizationContextType {
  organizations: OrganizationWithRole[];
  currentOrganization: OrganizationWithRole | null;
  members: OrganizationMember[];
  isLoading: boolean;
  isInitializing: boolean;
  fetchOrganizations: () => Promise<void>;
  fetchOrganizationMembers: (orgId: string) => Promise<void>;
  getMember: (orgId: string, userId: string) => Promise<OrganizationMember | null>;
  createOrganization: (name: string, slug: string) => Promise<OrganizationWithRole | null>;
  updateOrganization: (id: string, data: Partial<OrganizationWithRole>) => Promise<boolean>;
  switchOrganization: (org: OrganizationWithRole) => void;
  addMember: (orgId: string, email: string, role: string, name?: string) => Promise<boolean>;
  updateMemberRole: (orgId: string, userId: string, role: string) => Promise<boolean>;
  removeMember: (orgId: string, userId: string) => Promise<boolean>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization, setCurrentOrganization, isAuthenticated, user, isImpersonating } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  // Fetch organizations when authenticated
  useEffect(() => {
    const initializeOrganizations = async () => {
      console.log("🏢 OrganizationContext: isAuthenticated =", isAuthenticated);
      if (isAuthenticated) {
        console.log("🏢 Starting organizations initialization...");
        setIsInitializing(true);
        await fetchOrganizations();
        setIsInitializing(false);
        console.log("🏢 Organizations initialization complete");
      } else {
        console.log("🏢 Not authenticated, skipping initialization");
        setIsInitializing(false);
      }
    };

    initializeOrganizations();
  }, [isAuthenticated]);

  const fetchOrganizations = async () => {
    console.log("🏢 fetchOrganizations called");
    setIsLoading(true);
    try {
      const result = await organizationsApi.getAll();
      console.log("🏢 API result:", result);
      
      if (result.error) {
        throw new Error(result.error);
      }

      const orgs = result.data as any[];
      console.log("🏢 Organizations from API:", orgs);
      
      // Transform API response to match OrganizationWithRole type
      const transformedOrgs: OrganizationWithRole[] = orgs.map((org: any) => ({
        id: org.organizationId || org.organization_id,
        name: org.organizationName || org.organization_name,
        slug: org.organizationSlug || org.organization_slug,
        logoUrl: org.organizationLogoUrl || org.logoUrl || org.logo_url,
        subscriptionStatus: org.subscriptionStatus || org.subscription_status || "trial",
        subscriptionPlan: org.subscriptionPlan || org.subscription_plan || "free",
        subscriptionStripeCustomerId: org.subscriptionStripeCustomerId || org.subscription_stripe_customer_id,
        subscriptionStripeSubscriptionId: org.subscriptionStripeSubscriptionId || org.subscription_stripe_subscription_id,
        trialEndsAt: org.trialEndsAt || org.trial_ends_at ? new Date(org.trialEndsAt || org.trial_ends_at) : undefined,
        settings: org.settings || {},
        createdAt: new Date(org.createdAt || org.created_at || Date.now()),
        updatedAt: new Date(org.updatedAt || org.updated_at || Date.now()),
        userRole: org.userRole || org.user_role,
      }));

      console.log("🏢 Transformed organizations:", transformedOrgs);
      setOrganizations(transformedOrgs);

      // Update current organization with fresh data from API
      if (transformedOrgs.length > 0) {
        if (currentOrganization) {
          // Find and update the current organization with fresh data
          const updatedCurrentOrg = transformedOrgs.find(org => org.id === currentOrganization.id);
          if (updatedCurrentOrg) {
            console.log("🏢 Updating current organization with fresh data:", updatedCurrentOrg);
            setCurrentOrganization(updatedCurrentOrg);
          } else {
            // Current org not found, set first one
            console.log("🏢 Current org not found, setting first:", transformedOrgs[0]);
            setCurrentOrganization(transformedOrgs[0]);
          }
        } else {
          // No current organization, set the first one
          console.log("🏢 Setting first organization as current:", transformedOrgs[0]);
          setCurrentOrganization(transformedOrgs[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch organizations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizationMembers = async (orgId: string) => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.getMembers(orgId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      const membersData = result.data as any[];
      
      // Transform API response to match OrganizationMember type
      const transformedMembers: OrganizationMember[] = membersData.map((member: any) => {
        // Handle different date field naming conventions from backend
        const joinedAtValue = member.joined_at || member.joinedAt || member.created_at || member.createdAt;
        console.log("🔍 Member data:", member, "joinedAt value:", joinedAtValue);

        return {
          id: member.id,
          organizationId: member.organization_id || member.organizationId,
          userId: member.user_id || member.userId,
          role: member.role,
          joinedAt: joinedAtValue ? new Date(joinedAtValue) : new Date(),
          user: member.user ? {
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
          } : undefined,
        };
      });

      setMembers(transformedMembers);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      toast({
        title: "Error",
        description: "Failed to fetch organization members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createOrganization = async (name: string, slug: string): Promise<OrganizationWithRole | null> => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.create({ name, slug });
      
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error creando organización";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return null;
      }

      const orgData = result.data as any;

      // Transform API response to match OrganizationWithRole type
      const newOrg: OrganizationWithRole = {
        id: orgData.id,
        name: orgData.name,
        slug: orgData.slug,
        logoUrl: orgData.organizationLogoUrl || orgData.logoUrl || orgData.logo_url,
        subscriptionStatus: orgData.subscription_status,
        subscriptionPlan: orgData.subscription_plan,
        subscriptionStripeCustomerId: orgData.subscription_stripe_customer_id,
        subscriptionStripeSubscriptionId: orgData.subscription_stripe_subscription_id,
        trialEndsAt: orgData.trial_ends_at ? new Date(orgData.trial_ends_at) : undefined,
        settings: orgData.settings || {},
        createdAt: new Date(orgData.created_at),
        updatedAt: new Date(orgData.updated_at),
        userRole: "owner", // Creator is always owner
      };

      await fetchOrganizations();
      
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
      
      return newOrg;
    } catch (error) {
      console.error("Error creating organization:", error);
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrganization = async (id: string, data: Partial<OrganizationWithRole>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const updateData: any = {};
      
      if (data.name) updateData.name = data.name;
      if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
      if (data.settings) updateData.settings = data.settings;

      const result = await organizationsApi.update(id, updateData);
      
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error actualizando organización";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      await fetchOrganizations();
      
      // Update current organization if it was the one updated
      if (currentOrganization?.id === id) {
        const updatedOrg = organizations.find(org => org.id === id);
        if (updatedOrg) {
          setCurrentOrganization(updatedOrg);
        }
      }
      
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = (org: OrganizationWithRole) => {
    // Super admins can only switch organizations when impersonating
    if (user?.roles.includes("super_admin") && !isImpersonating) {
      toast({
        title: "Error",
        description: "Super admins must use impersonation to access organization views",
        variant: "destructive",
      });
      return;
    }

    setCurrentOrganization(org);
    toast({
      title: "Organization switched",
      description: `Now working in ${org.name}`,
    });
  };

  const getMember = async (orgId: string, userId: string): Promise<OrganizationMember | null> => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.getMember(orgId, userId);
      
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error obteniendo miembro";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return null;
      }

      return result.data as OrganizationMember;
    } catch (error) {
      console.error("Error fetching member:", error);
      toast({
        title: "Error",
        description: "Failed to fetch member details",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async (orgId: string, email: string, role: string, name?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.addMemberByEmail(orgId, email, role, name);
      
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error agregando miembro";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      await fetchOrganizationMembers(orgId);
      
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemberRole = async (orgId: string, userId: string, role: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.updateMemberRole(orgId, userId, { role });
      
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error actualizando rol";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      await fetchOrganizationMembers(orgId);
      
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error updating member role:", error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeMember = async (orgId: string, userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.removeMember(orgId, userId);
      
      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Error eliminando miembro";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      await fetchOrganizationMembers(orgId);
      
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        members,
        isLoading,
        isInitializing,
        fetchOrganizations,
        fetchOrganizationMembers,
        getMember,
        createOrganization,
        updateOrganization,
        switchOrganization,
        addMember,
        updateMemberRole,
        removeMember,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
