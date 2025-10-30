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
      const { data, error } = await expensesApi.getAll();
      if (error) throw new Error(error);
      return (data as Expense[]) || [];
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
  });
}

// Hook para obtener un gasto por ID
export function useExpense(id: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await expensesApi.getById(id);
      if (error) throw new Error(error);
      return data as Expense;
    },
    enabled: !!id, // Solo ejecuta si hay un ID válido
  });
}

// Hook para crear un gasto
export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (expense: any) => {
      const { data, error } = await expensesApi.create(expense);
      if (error) throw new Error(error);
      return data;
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
      const { data, error } = await expensesApi.update(id, expense);
      if (error) throw new Error(error);
      return data;
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
      const { error } = await expensesApi.delete(id);
      if (error) throw new Error(error);
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
