import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, FileUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TopperUploadDialogProps {
  clientName: string;
}

export const TopperUploadDialog = ({ clientName }: TopperUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [topperDetails, setTopperDetails] = useState("");
  const [topperPhotos, setTopperPhotos] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setTopperPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setTopperPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    toast({
      title: "Topper Information Saved",
      description: "The topper details and photos have been recorded for this order.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileUp className="h-4 w-4" />
          Topper Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cake Topper Details - {clientName}</DialogTitle>
          <DialogDescription>
            Upload reference photos and add details for the cake topper
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topper-details">Topper Details</Label>
            <Textarea
              id="topper-details"
              value={topperDetails}
              onChange={(e) => setTopperDetails(e.target.value)}
              placeholder="Describe the topper requirements (colors, text, theme, size, etc.)"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Reference Photos</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="relative" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photos
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </Button>
            </div>
            
            {topperPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {topperPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Topper reference ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Topper Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
