"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function StudentUpdateToast({ show }: { show: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!show) {
      return;
    }

    toast.success("Student record updated.");
    router.replace(window.location.pathname);
  }, [show, router]);

  return null;
}
