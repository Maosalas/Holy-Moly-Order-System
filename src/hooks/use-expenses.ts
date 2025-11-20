import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "@/lib/api";
import type { Expense } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";

// Query key factory para mantener consistencia
export const expenseKeys = {
  all: ['expenses'] as const,
  detail: (id: string) => ['expenses', id] as const,
};

// Hook para obtener todos los gastos
export function useExpenses() {
  return useQuery({
    queryKey: expenseKeys.all,
    queryFn: async () => {
      const result = await expensesApi.getAll();
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener gastos";
        throw new Error(errorMsg);
      }
      return (result as any).data || [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

// Hook para obtener un gasto por ID
export function useExpense(id: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: async () => {
      const result = await expensesApi.getById(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al obtener gasto";
        throw new Error(errorMsg);
      }
      return (result as any).data as Expense;
    },
    enabled: !!id,
  });
}

// Hook para crear un gasto
export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (expense: any) => {
      const result = await expensesApi.create(expense);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al crear gasto";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: () => {
      // Invalida y refresca la lista de gastos
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast({
        title: "Gasto creado",
        description: "El gasto se ha registrado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el gasto",
        variant: "destructive",
      });
    },
  });
}

// Hook para actualizar un gasto
export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, expense }: { id: string; expense: any }) => {
      const result = await expensesApi.update(id, expense);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al actualizar gasto";
        throw new Error(errorMsg);
      }
      return (result as any).data;
    },
    onSuccess: (_, variables) => {
      // Invalida la lista completa y el detalle específico
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.id) });
      toast({
        title: "Gasto actualizado",
        description: "Los cambios se han guardado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el gasto",
        variant: "destructive",
      });
    },
  });
}

// Hook para eliminar un gasto
export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await expensesApi.delete(id);
      if (result.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || "Error al eliminar gasto";
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast({
        title: "Gasto eliminado",
        description: "El gasto se ha eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el gasto",
        variant: "destructive",
      });
    },
  });
}
