import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface LoadingModalProps {
  isOpen: boolean;
  title: string;
  description: string;
}

export function LoadingModal({ isOpen, title, description }: LoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-neutral-600 mb-4">{description}</p>
          <Progress value={65} className="w-full" />
          <p className="text-sm text-neutral-500 mt-2">預計還需 30 秒</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
