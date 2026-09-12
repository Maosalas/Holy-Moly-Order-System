import { ImageIcon } from "lucide-react";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { cn } from "@/lib/utils";

interface PhotoThumbProps {
  value?: string | null;
  alt: string;
  className?: string;
}

export const PhotoThumb = ({ value, alt, className }: PhotoThumbProps) => {
  const url = usePhotoUrl(value);

  return (
    <div
      className={cn(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50",
        className
      )}
    >
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
};
