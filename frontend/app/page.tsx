"use client"

import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Award, BookOpen, FlaskConical, Loader2, Eye, ExternalLink, Calendar, Shield, Users, CheckCircle2, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n-context"
import Image from "next/image"
import Head from "next/head"
import { apiClient } from "@/lib/api-client"
import { prizesFromApiResponse } from "@/lib/prize-list-response"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Prize {
  prize_id: number
  title: string
  description?: string
  open_date: string
  close_date: string
  is_active: boolean | number
}

export default function Home() {
  const { t } = useTranslation()
  const { isAuthenticated, isAdmin } = useAuth()
  const [toastVisible, setToastVisible] = useState(false)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)

  // Fetch prizes from API
  useEffect(() => {
    const fetchPrizes = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get("/api/prize/public?limit=100&page=1")
        const allPrizes = prizesFromApiResponse(response.data) as Prize[]
        // Filter active prizes and limit to 3 for featured section
        const activePrizes = allPrizes
          .filter((prize: Prize) => prize.is_active === true || prize.is_active === 1)
          .slice(0, 3)
        setPrizes(activePrizes)
      } catch (err: any) {
        // Only log errors in development mode
        if (process.env.NODE_ENV === 'development') {
          console.error("Error fetching prizes:", err)
        }
        // Gracefully handle error - set empty array so UI shows "No active awards available"
        setPrizes([])
      } finally {
        setLoading(false)
      }
    }

    fetchPrizes()
  }, [])

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Intersection Observer for fade-in animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("parallax-visible")
        }
      })
    }, observerOptions)

    const cards = document.querySelectorAll(".parallax-card")
    cards.forEach((card) => observer.observe(card))

    return () => {
      cards.forEach((card) => observer.unobserve(card))
    }
  }, [prizes])

  // Helper function to get icon based on prize title
  const getIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes("scientist") || lowerTitle.includes("research")) {
      return FlaskConical
    }
    if (lowerTitle.includes("technology") || lowerTitle.includes("innovation")) {
      return Award
    }
    if (lowerTitle.includes("literature") || lowerTitle.includes("multimedia")) {
      return BookOpen
    }
    return Award // default icon
  }

  // Helper function to get category from title
  const getCategory = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes("scientist") || lowerTitle.includes("research")) {
      return "Research"
    }
    if (lowerTitle.includes("technology") || lowerTitle.includes("innovation")) {
      return "Technology"
    }
    if (lowerTitle.includes("literature") || lowerTitle.includes("multimedia")) {
      return "Multimedia"
    }
    return "Award"
  }

  // Format date for display (full format like prizes page)
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 2500) // hide toast after 2.5s
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Navbar />

        {/* Hero Section with Parallax */}
        <section
          ref={heroRef}
          className="relative py-16 md:py-28 overflow-hidden bg-slate-50 dark:bg-slate-950 parallax-hero"
          style={{ minHeight: "85vh", display: "flex", alignItems: "center" }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100% dark:opacity-100% parallax-bg"
            style={{
              backgroundImage: "url('/AwardGroupPhoto.jpg')",
              transform: `translateY(${scrollY * 0.5}px)`,
              willChange: "transform",
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60 parallax-overlay"
            style={{
              transform: `translateY(${scrollY * 0.3}px)`,
              willChange: "transform",
            }}
          />

          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div
              className="max-w-3xl mx-auto text-center space-y-6 parallax-content"
              style={{
                transform: `translateY(${scrollY * 0.2}px)`,
                opacity: 1 - scrollY / 800,
                willChange: "transform, opacity",
              }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg animate-fade-in">
                {t("hero.title")}
              </h1>
              <p className="text-lg md:text-xl text-gray-200 drop-shadow-md animate-fade-in-delay">
                {t("hero.subtitle")}
              </p>

              {/* <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-delay-2">
                <Link href="/prizes">
                  <Button size="lg" className="w-full sm:w-auto shadow-xl hover:scale-105 transition-transform">
                    {t("hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-transform">
                    {t("hero.learn_more")}
                  </Button>
                </Link>
              </div> */}
            </div>
          </div>
        </section>

        {/* Featured Prizes with Parallax */}
        <section className="py-14 bg-background relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl parallax-blob"
              style={{
                transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.15}px)`,
                willChange: "transform",
              }}
            />
            <div
              className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl parallax-blob"
              style={{
                transform: `translate(${-scrollY * 0.1}px, ${-scrollY * 0.15}px)`,
                willChange: "transform",
              }}
            />
          </div>

          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div
              className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4 parallax-fade-in"
              style={{
                opacity: Math.min(1, (scrollY - 200) / 100),
                transform: `translateY(${Math.max(0, 50 - (scrollY - 200) * 0.5)}px)`,
                willChange: "transform, opacity",
              }}
            >
              <div>
                <h2 className="text-3xl font-bold">{t("landing.featured_title")}</h2>
                <p className="text-muted-foreground mt-1">{t("landing.featured_desc")}</p>
              </div>

              <Link href="/prizes" className="flex text-primary hover:underline items-center group">
                {t("landing.view_all")} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading awards...</span>
              </div>
            ) : prizes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No active awards available at the moment.</p>
              </div>
            ) : (
              <>
                <div ref={cardsRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {prizes.map((prize, index) => {
                    const Icon = getIcon(prize.title)
                    const category = getCategory(prize.title)
                    
                    return (
                      <Card
                        key={prize.prize_id}
                        className="flex flex-col hover:shadow-2xl transition-all duration-500 parallax-card opacity-0 translate-y-8 hover:scale-105 hover:-translate-y-2"
                        style={{
                          transitionDelay: `${index * 100}ms`,
                        }}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                              <Icon className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary">{category}</Badge>
                          </div>
                          <CardTitle className="text-xl mb-3 line-clamp-2">{prize.title}</CardTitle>
                          <CardDescription className="text-sm line-clamp-3">
                            {prize.description ? (
                              prize.description.length > 150 
                                ? `${prize.description.substring(0, 150)}...` 
                                : prize.description
                            ) : `Recognizing excellence in ${category.toLowerCase()}.`}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span className="font-medium">Closes:</span>
                              <span>{formatDate(prize.close_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Award className="h-4 w-4 flex-shrink-0" />
                              <span className="font-medium">Opens:</span>
                              <span>{formatDate(prize.open_date)}</span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="border-t pt-4 gap-2 flex-col">
                          <div className="flex justify-between items-center w-full mb-2">
                            <span className="font-semibold text-sm text-muted-foreground">
                              PRZ-{prize.prize_id}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setSelectedPrize(prize)
                              setDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View More
                          </Button>
                          {/* Only show Apply Now button for authenticated users who are NOT admins */}
                          {isAuthenticated && !isAdmin && (prize.is_active === true || prize.is_active === 1) && (
                            <Link href={`/prizes/${prize.prize_id}/apply`} className="w-full">
                              <Button className="w-full" variant="default">
                                Apply Now
                              </Button>
                            </Link>
                          )}
                          {/* Show login prompt for non-authenticated users */}
                          {!isAuthenticated && (prize.is_active === true || prize.is_active === 1) && (
                            <Link href="/login" className="w-full">
                              <Button className="w-full" variant="default">
                                Login to Apply
                              </Button>
                            </Link>
                          )}
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>

                {/* Detail Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {selectedPrize && (
                      <>
                        <DialogHeader>
                          <div className="flex items-center justify-between">
                            <Badge variant={selectedPrize.is_active ? "default" : "secondary"}>
                              {selectedPrize.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm text-muted-foreground font-mono">
                              ID: PRZ-{selectedPrize.prize_id}
                            </span>
                          </div>
                          <DialogTitle className="text-2xl mt-4">{selectedPrize.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold mb-2 text-foreground">Description</h4>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                {selectedPrize.description || "No description available."}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                              <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-sm">Opening Date</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(selectedPrize.open_date)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-sm">Closing Date</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(selectedPrize.close_date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="w-full sm:w-auto"
                          >
                            Close
                          </Button>
                          {isAuthenticated && !isAdmin && (selectedPrize.is_active === true || selectedPrize.is_active === 1) && (
                            <Link href={`/prizes/${selectedPrize.prize_id}/apply`} className="w-full sm:w-auto">
                              <Button className="w-full">
                                Apply Now
                                <ExternalLink className="h-4 w-4 ml-2" />
                              </Button>
                            </Link>
                          )}
                          {!isAuthenticated && (selectedPrize.is_active === true || selectedPrize.is_active === 1) && (
                            <Link href="/login" className="w-full sm:w-auto">
                              <Button className="w-full">
                                Login to Apply
                                <ExternalLink className="h-4 w-4 ml-2" />
                              </Button>
                            </Link>
                          )}
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </section>

       {/* Footer */}
       <footer className="bg-slate-800 text-slate-200 py-12 mt-auto relative">
          <div className="container mx-auto px-4 lg:px-8 grid gap-8 sm:grid-cols-2 md:grid-cols-4">

            {/* NAST Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/Nepal_Academy_of_Science_and_Technology_Logo.svg.png" width={34} height={34} alt="NAST" />
                <span className="font-bold text-xl">NAST</span>
              </div>
              <p className="text-sm text-slate-400">{t("hero.subtitle")}</p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-3">{t("footer.quick_links")}</h3>
              <ul className="space-y-1 text-sm text-slate-400">
                <li><Link href="/prizes" className="hover:text-white">{t("nav.prizes")}</Link></li>
                <li><Link href="/about" className="hover:text-white">{t("nav.about")}</Link></li>
                <li><Link href="/contact" className="hover:text-white">{t("nav.contact")}</Link></li>
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h3 className="font-semibold mb-3">{t("footer.contact")}</h3>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>
                  <a
                    href="https://www.google.com/maps/place/Nepal+Academy+of+Science+and+Technology/@27.6561078,85.3251006,17z/data=!3m1!4b1!4m6!3m5!1s0x39eb17624b17beb9:0x16a8449f116b5fe!8m2!3d27.6561031!4d85.3276755!16s%2Fg%2F1tp_4tb8?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Khumaltar, Lalitpur
                  </a>
                </li>

                <li
                  className="cursor-pointer hover:underline"
                  onClick={() => handleCopy("PO Box: 3323")}
                >
                  PO Box: 3323
                </li>
                <li>
                  <a href="tel:+977-1-5547715" className="hover:underline">
                  +977-1-5253715 / 5253717 / 5253720 / 5253721
                  </a>
                </li>
                <li>
                  <a href="mailto:info@nast.gov.np" className="hover:underline">
                    info@nast.gov.np
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-3">{t("footer.legal")}</h3>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>{t("footer.privacy")}</li>
                <li>{t("footer.terms")}</li>
              </ul>
            </div>
          </div>

          <div className="text-center text-sm text-slate-500 mt-10">
            © {new Date().getFullYear()} {t("footer.rights")}
          </div>

          {/* Toast Notification */}
          <div
            className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg transition-all duration-300 ${
              toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            PO Box copied to clipboard!
          </div>
        </footer>
      </div>
    </>
  )
}