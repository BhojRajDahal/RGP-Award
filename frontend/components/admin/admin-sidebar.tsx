"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Trophy, Users, FileCheck, LogOut, FileText, ClipboardCheck, Images, BarChart, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

const adminSidebarItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Trophy, label: "Awards", href: "/admin/prizes" },
  { icon: FileCheck, label: "Applications", href: "/admin/applications" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: ClipboardCheck, label: "Evaluators", href: "/admin/evaluators" },
  { icon: FileText, label: "Common Fields", href: "/admin/fields" },
  { icon: BarChart, label: "Marks Details", href: "/admin/marks" },
  { icon: Images, label: "Manage Gallery", href: "/admin/gallery" },
  { icon: Settings, label: "Admin Settings", href: "/admin/settings" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="px-2 py-2">
        <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight text-primary">Admin Portal</h2>
      </div>
      <div className="space-y-1">
        {adminSidebarItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-2", pathname === item.href && "bg-secondary")}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
      <div className="mt-auto pt-4 border-t">
        <Link href="/login">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  )
}
