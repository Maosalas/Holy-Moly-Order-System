import React, { createContext, useContext, useState, useEffect } from "react";
import type { OrganizationWithRole, OrganizationMember } from "@/types/organization";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OrganizationContextType {
  organizations: OrganizationWithRole[];
  currentOrganization: OrganizationWithRole | null;
  members: OrganizationMember[];
  isLoading: boolean;
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
  const { toast } = useToast();

  // Fetch organizations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
    }
  }, [isAuthenticated]);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch('/api/organizations', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setOrganizations(data.data);
      
      // Mock data for now
      console.log("Fetching organizations - API not implemented yet");
      setOrganizations([]);
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
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch(`/api/organizations/${orgId}/members`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setMembers(data.data);
      
      // Mock data for now
      console.log(`Fetching members for organization ${orgId} - API not implemented yet`);
      setMembers([]);
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
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch('/api/organizations', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ name, slug })
      // });
      // const data = await response.json();
      // if (data.success) {
      //   await fetchOrganizations();
      //   return data.data;
      // }
      
      console.log("Creating organization - API not implemented yet");
      toast({
        title: "Info",
        description: "Organization API not implemented yet",
      });
      return null;
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
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch(`/api/organizations/${id}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify(data)
      // });
      // const result = await response.json();
      // if (result.success) {
      //   await fetchOrganizations();
      //   return true;
      // }
      
      console.log("Updating organization - API not implemented yet");
      toast({
        title: "Info",
        description: "Organization API not implemented yet",
      });
      return false;
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
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch(`/api/organizations/${orgId}/members`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ user_id: userId, role })
      // });
      // const result = await response.json();
      // if (result.success) {
      //   await fetchOrganizationMembers(orgId);
      //   return true;
      // }
      
      console.log("Adding member - API not implemented yet");
      toast({
        title: "Info",
        description: "Member API not implemented yet",
      });
      return false;
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
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ role })
      // });
      // const result = await response.json();
      // if (result.success) {
      //   await fetchOrganizationMembers(orgId);
      //   return true;
      // }
      
      console.log("Updating member role - API not implemented yet");
      toast({
        title: "Info",
        description: "Member API not implemented yet",
      });
      return false;
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
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
      //   method: 'DELETE',
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const result = await response.json();
      // if (result.success) {
      //   await fetchOrganizationMembers(orgId);
      //   return true;
      // }
      
      console.log("Removing member - API not implemented yet");
      toast({
        title: "Info",
        description: "Member API not implemented yet",
      });
      return false;
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
