"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/ui/navbar"
import { ApplicationWizard } from "@/components/application/application-wizard"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { Award, ChevronRight } from "lucide-react"
import Link from "next/link"

interface PrizeDetails {
  prize_id: number
  title: string
  description?: string
  open_date?: string
  close_date?: string
  is_active?: boolean
}

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated, isAdmin, isChecking } = useAuth({ requireAuth: true })
  const router = useRouter()
  const { id } = use(params)
  const [prize, setPrize] = useState<PrizeDetails | null>(null)
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

  useEffect(() => {
    const fetchPrize = async () => {
      try {
        const res = await apiClient.get(`/api/prize/public?limit=100&page=1`)
        const items = res.data?.items || []
        const found = items.find((p: any) => String(p.prize_id) === String(id))
        if (found) {
          setPrize(found)
        }
      } catch (err) {
        console.error("Failed to load prize details:", err)
      }
    }
    if (id) {
      fetchPrize()
    }
  }, [id])

  // Show nothing while checking or redirecting
  if (isChecking || isAdmin || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950">
      <Navbar />
      
      <main className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Breadcrumbs & Header Banner */}
        <div className="mb-8">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/prizes" className="hover:text-foreground transition-colors">Awards</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium truncate max-w-xs">
              {prize?.title || `Award Application ${currentYear}`}
            </span>
          </nav>

          <div className="border-b pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                <Award className="h-3.5 w-3.5" />
                <span>NAST Award Application • {currentYear}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {prize?.title || `National Science Award ${currentYear}`}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Complete all steps below to submit your official nomination and evaluation documents.
              </p>
            </div>
          </div>
        </div>

        <ApplicationWizard prizeId={id} prize={prize} />
      </main>
    </div>
  )
}

