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
  createOrganization: (name: string, slug: string) => Promise<OrganizationWithRole | null>;
  updateOrganization: (id: string, data: Partial<OrganizationWithRole>) => Promise<boolean>;
  switchOrganization: (org: OrganizationWithRole) => void;
  addMember: (orgId: string, userId: string, role: string) => Promise<boolean>;
  updateMemberRole: (orgId: string, userId: string, role: string) => Promise<boolean>;
  removeMember: (orgId: string, userId: string) => Promise<boolean>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization, setCurrentOrganization, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  // Fetch organizations when authenticated
  useEffect(() => {
    const initializeOrganizations = async () => {
      if (isAuthenticated) {
        setIsInitializing(true);
        await fetchOrganizations();
        setIsInitializing(false);
      } else {
        setIsInitializing(false);
      }
    };

    initializeOrganizations();
  }, [isAuthenticated]);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.getAll();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const orgs = result.data as any[];
      
      // Transform API response to match OrganizationWithRole type
      const transformedOrgs: OrganizationWithRole[] = orgs.map((org: any) => ({
        id: org.organization_id,
        name: org.organization_name,
        slug: org.organization_slug,
        logoUrl: org.logo_url,
        subscriptionStatus: org.subscription_status || "trial",
        subscriptionPlan: org.subscription_plan || "free",
        subscriptionStripeCustomerId: org.subscription_stripe_customer_id,
        subscriptionStripeSubscriptionId: org.subscription_stripe_subscription_id,
        trialEndsAt: org.trial_ends_at ? new Date(org.trial_ends_at) : undefined,
        settings: org.settings || {},
        createdAt: new Date(org.created_at || Date.now()),
        updatedAt: new Date(org.updated_at || Date.now()),
        userRole: org.user_role,
      }));

      setOrganizations(transformedOrgs);

      // If no current organization is set and we have organizations, set the first one
      if (!currentOrganization && transformedOrgs.length > 0) {
        setCurrentOrganization(transformedOrgs[0]);
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
      const transformedMembers: OrganizationMember[] = membersData.map((member: any) => ({
        id: member.id,
        organizationId: member.organization_id,
        userId: member.user_id,
        role: member.role,
        joinedAt: new Date(member.joined_at),
        user: member.user ? {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
        } : undefined,
      }));

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
        toast({
          title: "Error",
          description: result.error,
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
        logoUrl: orgData.logo_url,
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
        toast({
          title: "Error",
          description: result.error,
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
    setCurrentOrganization(org);
    toast({
      title: "Organization switched",
      description: `Now working in ${org.name}`,
    });
  };

  const addMember = async (orgId: string, userId: string, role: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await organizationsApi.addMember(orgId, { user_id: userId, role });
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
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
        toast({
          title: "Error",
          description: result.error,
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
        toast({
          title: "Error",
          description: result.error,
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
