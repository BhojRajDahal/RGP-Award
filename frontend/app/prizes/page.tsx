"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Search,
  Filter,
  Calendar,
  Award,
  Loader2,
  Eye,
  ExternalLink,
  Clock,
  TrendingUp,
  BookOpen,
  FlaskConical,
  X,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "@/lib/i18n-context"
import { apiClient } from "@/lib/api-client"
import { prizesFromApiResponse } from "@/lib/prize-list-response"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface Prize {
  prize_id: number
  title: string
  description?: string
  open_date: string
  close_date: string
  is_active: boolean | number
}

type FilterType = "all" | "active" | "inactive" | "upcoming" | "closing_soon"
type SortType = "newest" | "oldest" | "deadline_asc" | "deadline_desc" | "title_asc" | "title_desc"

export default function PrizesPage() {
  const { t } = useTranslation()
  const { user, isAuthenticated, isAdmin } = useAuth()
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [sort, setSort] = useState<SortType>("newest")
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)

  const fetchPrizes = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get("/api/prize/public?limit=100&page=1")
      setPrizes(prizesFromApiResponse(response.data) as Prize[])
    } catch (err: any) {
      console.error("Error fetching prizes:", err)
      toast.error("Failed to load prizes. Please try again later.")
      setPrizes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrizes()
  }, [])

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
    return Award
  }

  // Check if prize is closing soon (within 7 days)
  const isClosingSoon = (closeDate: string) => {
    const today = new Date()
    const close = new Date(closeDate)
    const diffTime = close.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 && diffDays <= 7
  }

  // Check if prize is upcoming (not yet open)
  const isUpcoming = (openDate: string) => {
    const today = new Date()
    const open = new Date(openDate)
    return open > today
  }

  // Get days until deadline
  const getDaysUntilDeadline = (closeDate: string) => {
    const today = new Date()
    const close = new Date(closeDate)
    const diffTime = close.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Filter and sort prizes
  const filteredAndSortedPrizes = useMemo(() => {
    let filtered = prizes.filter((prize) => {
      // Search filter
      const matchesSearch =
        prize.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prize.description?.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      // Status filter
      switch (filter) {
        case "active":
          return prize.is_active === true || prize.is_active === 1
        case "inactive":
          return prize.is_active === false || prize.is_active === 0
        case "upcoming":
          return isUpcoming(prize.open_date)
        case "closing_soon":
          return (
            (prize.is_active === true || prize.is_active === 1) &&
            isClosingSoon(prize.close_date)
          )
        default:
          return true
      }
    })

    // Sort prizes
    filtered.sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(b.open_date).getTime() - new Date(a.open_date).getTime()
        case "oldest":
          return new Date(a.open_date).getTime() - new Date(b.open_date).getTime()
        case "deadline_asc":
          return new Date(a.close_date).getTime() - new Date(b.close_date).getTime()
        case "deadline_desc":
          return new Date(b.close_date).getTime() - new Date(a.close_date).getTime()
        case "title_asc":
          return (a.title || "").localeCompare(b.title || "")
        case "title_desc":
          return (b.title || "").localeCompare(a.title || "")
        default:
          return 0
      }
    })

    return filtered
  }, [prizes, searchQuery, filter, sort])

  const activeCount = prizes.filter(
    (p) => p.is_active === true || p.is_active === 1
  ).length
  const closingSoonCount = prizes.filter(
    (p) =>
      (p.is_active === true || p.is_active === 1) && isClosingSoon(p.close_date)
  ).length

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navbar />

      <main className="flex-1 container mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Enhanced Header Section */}
        <div className="mb-8 md:mb-12">
          <div className="space-y-2 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t("prizes.title") || "Available Prizes & Grants"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t("prizes.subtitle") ||
                "Browse and apply for current opportunities. Discover prestigious awards recognizing excellence in science and technology."}
            </p>
          </div>

          {/* Stats Card and Filter/Sort Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
            {/* Stats Cards */}
            <div className="flex gap-4">
              <div className="bg-card rounded-lg border p-4 shadow-sm min-w-[120px]">
                <div className="text-2xl font-bold text-primary">{activeCount}</div>
                <div className="text-xs text-muted-foreground">Active Prizes</div>
              </div>
              {closingSoonCount > 0 && (
                <div className="bg-card rounded-lg border p-4 shadow-sm min-w-[120px] border-orange-200 dark:border-orange-800">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {closingSoonCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Closing Soon</div>
                </div>
              )}
            </div>

            {/* Filter and Sort Buttons */}
            <div className="flex gap-2">
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                    {filter !== "all" && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                      >
                        !
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setFilter("all")}
                    className={cn("cursor-pointer", filter === "all" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", filter === "all" ? "opacity-100" : "opacity-0")} />
                    All Prizes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("active")}
                    className={cn("cursor-pointer", filter === "active" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", filter === "active" ? "opacity-100" : "opacity-0")} />
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("upcoming")}
                    className={cn("cursor-pointer", filter === "upcoming" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", filter === "upcoming" ? "opacity-100" : "opacity-0")} />
                    Upcoming
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("closing_soon")}
                    className={cn("cursor-pointer", filter === "closing_soon" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", filter === "closing_soon" ? "opacity-100" : "opacity-0")} />
                    Closing Soon
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("inactive")}
                    className={cn("cursor-pointer", filter === "inactive" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", filter === "inactive" ? "opacity-100" : "opacity-0")} />
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setSort("newest")}
                    className={cn("cursor-pointer", sort === "newest" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", sort === "newest" ? "opacity-100" : "opacity-0")} />
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSort("deadline_asc")}
                    className={cn("cursor-pointer", sort === "deadline_asc" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", sort === "deadline_asc" ? "opacity-100" : "opacity-0")} />
                    Deadline (Soonest)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSort("deadline_desc")}
                    className={cn("cursor-pointer", sort === "deadline_desc" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", sort === "deadline_desc" ? "opacity-100" : "opacity-0")} />
                    Deadline (Latest)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSort("title_asc")}
                    className={cn("cursor-pointer", sort === "title_asc" && "bg-primary/10 text-primary font-medium")}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 mr-2", sort === "title_asc" ? "opacity-100" : "opacity-0")} />
                    Title (A-Z)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("prizes.search") || "Search prizes by title or description..."}
                className="pl-10 h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(filter !== "all" || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {filter === "active"
                    ? "Active"
                    : filter === "inactive"
                    ? "Inactive"
                    : filter === "upcoming"
                    ? "Upcoming"
                    : "Closing Soon"}
                  <button
                    onClick={() => setFilter("all")}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                    aria-label="Remove filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setFilter("all")
                }}
                className="h-6 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && filteredAndSortedPrizes.length > 0 && (
          <div className="mb-6 text-sm text-muted-foreground">
            Showing {filteredAndSortedPrizes.length} of {prizes.length} prizes
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedPrizes.length === 0 ? (
          /* Enhanced Empty State */
          <div className="text-center py-16 md:py-24">
            <div className="max-w-md mx-auto">
              <div className="mb-6 flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <Award className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery || filter !== "all"
                  ? "No prizes match your criteria"
                  : "No prizes available"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Check back soon for new opportunities."}
              </p>
              {(searchQuery || filter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Enhanced Prize Cards Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedPrizes.map((prize, index) => {
              const Icon = getIcon(prize.title)
              const daysUntilDeadline = getDaysUntilDeadline(prize.close_date)
              const isClosingSoon = daysUntilDeadline > 0 && daysUntilDeadline <= 7
              const isUpcomingPrize = isUpcoming(prize.open_date)

              return (
                <Card
                  key={prize.prize_id}
                  className={cn(
                    "flex flex-col group hover:shadow-xl transition-all duration-300 border-2",
                    "hover:border-primary/20 hover:-translate-y-1",
                    isClosingSoon && "border-orange-200 dark:border-orange-800",
                    isUpcomingPrize && "border-blue-200 dark:border-blue-800"
                  )}
                >
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge
                          variant={prize.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {prize.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {isClosingSoon && (
                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 dark:text-orange-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Closing Soon
                          </Badge>
                        )}
                        {isUpcomingPrize && (
                          <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 dark:text-blue-400">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Upcoming
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        PRZ-{prize.prize_id}
                      </span>
                    </div>
                    <CardTitle className="text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {prize.title}
                    </CardTitle>
                    <CardDescription className="text-sm line-clamp-2">
                      {prize.description ? (
                        prize.description.length > 120
                          ? `${prize.description.substring(0, 120)}...`
                          : prize.description
                      ) : (
                        <span className="text-muted-foreground italic">
                          No description available.
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3 pb-4">
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="font-medium">Opens:</span>
                        <span>{formatDate(prize.open_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="font-medium text-muted-foreground">Closes:</span>
                        <span
                          className={cn(
                            "font-medium",
                            isClosingSoon
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatDate(prize.close_date)}
                        </span>
                        {daysUntilDeadline > 0 && daysUntilDeadline <= 30 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs ml-auto",
                              isClosingSoon
                                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                : ""
                            )}
                          >
                            {daysUntilDeadline} {daysUntilDeadline === 1 ? "day" : "days"} left
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4 gap-2 flex-col border-t">
                    <Button
                      variant="outline"
                      className="w-full group/btn"
                      onClick={() => {
                        setSelectedPrize(prize)
                        setDialogOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                      View Details
                    </Button>
                    {isAuthenticated && !isAdmin && (prize.is_active === true || prize.is_active === 1) && (
                      <Link href={`/prizes/${prize.prize_id}/apply`} className="w-full">
                        <Button className="w-full shadow-md hover:shadow-lg transition-all">
                          Apply Now
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                    {!isAuthenticated && (prize.is_active === true || prize.is_active === 1) && (
                      <Link href="/login" className="w-full">
                        <Button className="w-full shadow-md hover:shadow-lg transition-all">
                          Login to Apply
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Enhanced Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedPrize && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={selectedPrize.is_active ? "default" : "secondary"}>
                        {selectedPrize.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {isClosingSoon(selectedPrize.close_date) && (
                        <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Closing Soon
                        </Badge>
                      )}
                      {isUpcoming(selectedPrize.open_date) && (
                        <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Upcoming
                        </Badge>
                      )}
                    </div>
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
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Opening Date</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(selectedPrize.open_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Closing Date</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(selectedPrize.close_date)}
                          </p>
                          {getDaysUntilDeadline(selectedPrize.close_date) > 0 &&
                            getDaysUntilDeadline(selectedPrize.close_date) <= 30 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                {getDaysUntilDeadline(selectedPrize.close_date)}{" "}
                                {getDaysUntilDeadline(selectedPrize.close_date) === 1
                                  ? "day"
                                  : "days"}{" "}
                                remaining
                              </p>
                            )}
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
                      <Button className="w-full shadow-md hover:shadow-lg transition-all">
                        Apply Now
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                  {!isAuthenticated && (selectedPrize.is_active === true || selectedPrize.is_active === 1) && (
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button className="w-full shadow-md hover:shadow-lg transition-all">
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
      </main>

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
  )
}
