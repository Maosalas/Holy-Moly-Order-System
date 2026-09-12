import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadItemPhoto, isExternalUrl } from "@/lib/photos";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useOrganization } from "@/contexts/OrganizationContext";

interface PhotoFieldProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}

export const PhotoField = ({ value, onChange, label = "Foto" }: PhotoFieldProps) => {
  const { currentOrganization } = useOrganization();
  const previewUrl = usePhotoUrl(value);
  const [urlDraft, setUrlDraft] = useState(isExternalUrl(value) ? value! : "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadItemPhoto(file, currentOrganization?.id || "");
      onChange(path);
      toast({ title: "Foto subida", description: "La imagen quedó guardada." });
    } catch (e: any) {
      toast({ title: "No se pudo subir la foto", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (!isExternalUrl(trimmed)) {
      toast({
        title: "Enlace inválido",
        description: "Pegá un enlace que empiece con http:// o https://",
        variant: "destructive",
      });
      return;
    }
    onChange(trimmed);
    toast({ title: "Foto agregada" });
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/50">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Subir imagen</TabsTrigger>
              <TabsTrigger value="url">Usar enlace</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="pt-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Subiendo..." : "Elegir imagen"}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">JPG o PNG, hasta 10 MB.</p>
            </TabsContent>

            <TabsContent value="url" className="pt-2">
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={applyUrl}>
                  Usar
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                onChange(null);
                setUrlDraft("");
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Quitar foto
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
