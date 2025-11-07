import { RecipeParameterList } from "@/components/RecipeParameterList";

export default function RecipeParameters() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Parámetros Globales</h1>
        <p className="text-muted-foreground">
          Define cantidades estándar que se usan en tus recetas, como rellenos,
          cubiertas y decoraciones.
        </p>
      </div>
      <RecipeParameterList />
    </div>
  );
}
