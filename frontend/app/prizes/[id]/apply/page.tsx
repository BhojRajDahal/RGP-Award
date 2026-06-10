"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/ui/navbar"
import { ApplicationWizard } from "@/components/application/application-wizard"
import { useAuth } from "@/hooks/use-auth"

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated, isAdmin, isChecking } = useAuth()
  const router = useRouter()
  const { id } = use(params)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!isChecking) {
      // Redirect admins away from apply page
      if (isAdmin) {
        router.push("/prizes")
        return
      }
      // Redirect non-authenticated users to login
      if (!isAuthenticated) {
        router.push("/login")
        return
      }
    }
  }, [isChecking, isAuthenticated, isAdmin, router])

  // Show nothing while checking or redirecting
  if (isChecking || isAdmin || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 container py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Application for National Science Award {currentYear}</h1>
            <p className="text-muted-foreground">
              Please complete all sections accurately.
            </p>
          </div>

          <ApplicationWizard prizeId={id} />
        </div>
      </main>
    </div>
  )
}
