import { JSX, useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Loader } from "lucide-react";

export const useConfirm = (
  title: string,
  description: string
): [() => JSX.Element, () => Promise<unknown>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: unknown) => void;
  } | null>(null);

  const confirm = () => {
    return new Promise((resolve) => {
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmationDialog = () => {
    return (
      <ResponsiveDialog
        open={promise !== null}
        onOpenChange={handleClose}
        title={title}
        description={description}
      >
        <div className="pt-4 w-full flex flex-col-reverse gap-y-2 lg:flex-row gap-x-2 items-center justify-end">
          <Button
            variant="outline"
            className="w-full lg:w-auto"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button className="w-full lg:w-auto" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </ResponsiveDialog>
    );
  };

  return [ConfirmationDialog, confirm];
};
