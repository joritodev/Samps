"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUnreadNotificationCountAction } from "@/lib/actions/notifications.actions";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getUnreadNotificationCountAction()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/notificacoes">
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 border-0 bg-destructive px-1 text-[10px] text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
