"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoaderCircle, ShieldAlert, X } from "lucide-react";

export interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
}

/**
 * Reusable confirmation dialog (AlertDialog) for destructive / irreversible actions.
 * 
 * UX Standards (Strict Master Rule):
 * 1. Mobile Hierarchy (< sm): Action/Confirm (ลบ/ยืนยัน) MUST be on TOP, Cancel (ยกเลิก) MUST be on BOTTOM.
 * 2. Prevents premature closing while an async action (e.g. deletion) is in flight.
 * 3. Displays immediate loading spinner inside the confirm action button during `pending`.
 * 4. Disables cancel and confirm buttons to prevent duplicate triggers.
 * 5. Automatically closes as soon as `pending` transitions back to false.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    // When pending changes from true -> false, the action has finished, close dialog
    if (wasPendingRef.current && !pending) {
      setOpen(false);
    }
    wasPendingRef.current = pending;
  }, [pending]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    onConfirm();

    // If caller doesn't track pending, close after a brief delay
    setTimeout(() => {
      if (!wasPendingRef.current) {
        setOpen(false);
      }
    }, 150);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Prevent closing while operation is pending
        if (!pending) {
          setOpen(nextOpen);
        }
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Action / Confirm (ลบ/ยืนยัน) is placed first -> displays on TOP on mobile, RIGHT on desktop */}
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="gap-2 min-w-[100px]"
          >
            {pending ? (
              <>
                <LoaderCircle className="size-4 animate-spin shrink-0" />
                <span>กำลังลบ...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="size-4 shrink-0" />
                <span>{confirmLabel}</span>
              </>
            )}
          </AlertDialogAction>
          {/* Cancel (ยกเลิก) is placed second -> displays on BOTTOM on mobile, LEFT on desktop */}
          <AlertDialogCancel disabled={pending}>
            <X />
            {cancelLabel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
