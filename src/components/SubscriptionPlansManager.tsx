import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { SubscriptionPlanDetails } from "@/types/subscription";

export default function SubscriptionPlansManager() {
  const { plans, isLoading, createPlan, updatePlan, deletePlan } = useSubscriptionPlans(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanDetails | null>(null);
  const [formData, setFormData] = useState<Partial<SubscriptionPlanDetails>>({
    name: "",
    slug: "free",
    priceMonthly: 0,
    priceYearly: 0,
    maxOrdersPerMonth: 0,
    maxUsers: 0,
    maxStorageGb: 0,
    active: true,
  });

  const openDialog = (plan?: SubscriptionPlanDetails) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        slug: "free",
        priceMonthly: 0,
        priceYearly: 0,
        maxOrdersPerMonth: 0,
        maxUsers: 0,
        maxStorageGb: 0,
        active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Transform to snake_case for API
    const apiData = {
      name: formData.name,
      slug: formData.slug,
      price_monthly: formData.priceMonthly,
      price_yearly: formData.priceYearly,
      max_orders_per_month: formData.maxOrdersPerMonth,
      max_users: formData.maxUsers,
      max_storage_gb: formData.maxStorageGb,
      features: formData.features || {},
      active: formData.active,
    };

    if (editingPlan) {
      await updatePlan(editingPlan.id, apiData);
    } else {
      await createPlan(apiData);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (planId: string) => {
    await deletePlan(planId);
  };

  const toggleActive = async (planId: string, currentActive: boolean) => {
    await updatePlan(planId, { active: !currentActive });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>Manage all subscription plans and pricing</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading subscription plans...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Monthly Price</TableHead>
                <TableHead>Yearly Price</TableHead>
                <TableHead>Orders/Month</TableHead>
                <TableHead>Max Users</TableHead>
                <TableHead>Storage (GB)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No subscription plans found
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>${plan.priceMonthly.toFixed(2)}</TableCell>
                    <TableCell>${plan.priceYearly.toFixed(2)}</TableCell>
                    <TableCell>
                      {plan.maxOrdersPerMonth === -1 ? "Unlimited" : plan.maxOrdersPerMonth}
                    </TableCell>
                    <TableCell>
                      {plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers}
                    </TableCell>
                    <TableCell>{plan.maxStorageGb}</TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? "default" : "secondary"}>
                        {plan.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(plan.id, plan.active)}
                        >
                          <Switch checked={plan.active} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value as any })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceMonthly">Monthly Price ($) *</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  step="0.01"
                  value={formData.priceMonthly}
                  onChange={(e) =>
                    setFormData({ ...formData, priceMonthly: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceYearly">Yearly Price ($) *</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  step="0.01"
                  value={formData.priceYearly}
                  onChange={(e) =>
                    setFormData({ ...formData, priceYearly: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxOrders">Max Orders/Month *</Label>
                <Input
                  id="maxOrders"
                  type="number"
                  value={formData.maxOrdersPerMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, maxOrdersPerMonth: parseInt(e.target.value) })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">Use -1 for unlimited</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Users *</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) =>
                    setFormData({ ...formData, maxUsers: parseInt(e.target.value) })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">Use -1 for unlimited</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStorage">Storage (GB) *</Label>
                <Input
                  id="maxStorage"
                  type="number"
                  value={formData.maxStorageGb}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStorageGb: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
