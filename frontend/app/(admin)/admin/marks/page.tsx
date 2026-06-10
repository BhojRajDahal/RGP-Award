"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"
import { Loader2, ArrowUpDown, Download, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { downloadMarkCertificatePdf } from "@/lib/mark-certificate-pdf"

const NAST_LOGO = "/Nepal_Academy_of_Science_and_Technology_Logo.svg.png"
const MARKS_PER_PAGE = 10

/** `application_marks.created_at` from API (ISO string or serialized Date). */
function formatMarksAssignedAt(value: string | null | undefined): string {
  if (value == null || value === "") return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type ViewSnapshot = {
  marks: number
  remarks: string | null
}

function getAdminBearer(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
}

interface MarkDetail {
  mark_id: number
  application_id: number
  marks: number
  remarks: string | null
  created_at: string
  user_id: number
  name: string
  email: string
  phone: string | null
  prize_id: number
  award: string
  year: number
}

export default function MarksDetailsPage() {
  const [marksDetails, setMarksDetails] = useState<MarkDetail[]>([])
  const [displayedMarks, setDisplayedMarks] = useState<MarkDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedPrize, setSelectedPrize] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [years, setYears] = useState<number[]>([])
  const [prizes, setPrizes] = useState<{ prize_id: number; award: string }[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: keyof MarkDetail | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  })

  const [viewOpen, setViewOpen] = useState(false)
  const [viewRow, setViewRow] = useState<MarkDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  /** Filled after remarks/marks fetch completes — download allowed only when non-null */
  const [viewSnapshot, setViewSnapshot] = useState<ViewSnapshot | null>(null)

  const fetchMarksDetails = useCallback(async () => {
    setLoading(true)
    try {
      const adminToken = getAdminBearer()

      if (!adminToken) {
        toast.error("Admin authentication required")
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (selectedYear && selectedYear !== 'all') {
        params.append('year', selectedYear)
      }
      if (selectedPrize && selectedPrize !== 'all') {
        params.append('prize_id', selectedPrize)
      }

      const response = await apiClient.get(`/api/admin/marks-details?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      setMarksDetails(response.data?.marks_details || [])
    } catch (error: any) {
      console.error("Error fetching marks details:", error)
      toast.error(error.response?.data?.msg || "Failed to load marks details")
      setMarksDetails([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedYear, selectedPrize])

  const fetchYears = async () => {
    try {
      const adminToken = getAdminBearer()

      if (!adminToken) {
        return
      }

      const response = await apiClient.get("/api/admin/marks-details/years", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      setYears(response.data?.years || [])
    } catch (error: any) {
      console.error("Error fetching years:", error)
    }
  }

  const fetchPrizes = async () => {
    try {
      const adminToken = getAdminBearer()

      if (!adminToken) {
        return
      }

      const response = await apiClient.get("/api/admin/marks-details/prizes", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      setPrizes(response.data?.prizes || [])
    } catch (error: any) {
      console.error("Error fetching prizes:", error)
    }
  }

  const handlePrizeChange = (value: string) => {
    setSelectedPrize(value)
    setCurrentPage(1)
  }

  const handleYearChange = (value: string) => {
    setSelectedYear(value)
    setCurrentPage(1)
  }

  const handleSort = (key: keyof MarkDetail) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return {
        key,
        direction: 'asc'
      }
    })
  }

  const applySorting = useCallback(() => {
    let sorted = [...marksDetails]

    // Apply sorting
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key!]
        const bValue = b[sortConfig.key!]

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc'
            ? aValue - bValue
            : bValue - aValue
        }

        return 0
      })
    }

    setDisplayedMarks(sorted)
  }, [marksDetails, sortConfig])

  useEffect(() => {
    fetchYears()
    fetchPrizes()
  }, [])

  useEffect(() => {
    // Debounce search query
    const timeoutId = setTimeout(() => {
      fetchMarksDetails()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [fetchMarksDetails])

  useEffect(() => {
    applySorting()
  }, [applySorting])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(displayedMarks.length / MARKS_PER_PAGE))
  const paginatedMarks = displayedMarks.slice(
    (currentPage - 1) * MARKS_PER_PAGE,
    currentPage * MARKS_PER_PAGE
  )
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openViewRemarks = async (mark: MarkDetail) => {
    setViewRow(mark)
    setViewSnapshot(null)
    setViewOpen(true)
    setViewLoading(true)

    const fallback: ViewSnapshot = {
      marks: mark.marks,
      remarks: mark.remarks ?? null,
    }

    const adminToken = getAdminBearer()
    if (!adminToken) {
      toast.error("Admin authentication required")
      setViewSnapshot(fallback)
      setViewLoading(false)
      return
    }

    try {
      const response = await apiClient.get(`/api/application/${mark.application_id}/marks`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const rows = Array.isArray(response.data) ? response.data : []
      const latest = rows[0] as { remarks?: string | null; marks?: number } | undefined
      setViewSnapshot({
        marks:
          latest?.marks !== undefined && latest?.marks !== null
            ? Number(latest.marks)
            : mark.marks,
        remarks: latest?.remarks ?? mark.remarks ?? null,
      })
    } catch (error: any) {
      console.error("Error fetching marks details:", error)
      toast.error(error.response?.data?.msg || "Could not load full details")
      setViewSnapshot(fallback)
    } finally {
      setViewLoading(false)
    }
  }

  const handleDownloadPdfFromDialog = async () => {
    if (!viewRow || !viewSnapshot) {
      toast.error("Open details first, then download.")
      return
    }
    try {
      await downloadMarkCertificatePdf({
        application_id: viewRow.application_id,
        name: viewRow.name,
        phone: viewRow.phone,
        email: viewRow.email,
        award: viewRow.award,
        year: viewRow.year,
        marks: viewSnapshot.marks,
        remarks: viewSnapshot.remarks,
      })
      toast.success("PDF downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Failed to generate PDF")
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marks Details</h1>
        <p className="text-muted-foreground">
          View and manage marks details for all applications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marks Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="sm:w-64">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, email, or award..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="sm:w-48">
              <Label htmlFor="year-filter">Filter Year</Label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger id="year-filter">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-48">
              <Label htmlFor="prize-filter">Filter Award</Label>
              <Select value={selectedPrize} onValueChange={handlePrizeChange}>
                <SelectTrigger id="prize-filter">
                  <SelectValue placeholder="All Awards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Awards</SelectItem>
                  {prizes.map((prize) => (
                    <SelectItem key={prize.prize_id} value={String(prize.prize_id)}>
                      {prize.award}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayedMarks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No marks details found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone No.</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('award')}
                    >
                      <div className="flex items-center gap-2">
                        Award
                        {sortConfig.key === 'award' && (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 whitespace-nowrap min-w-[9rem]"
                      onClick={() => handleSort("created_at")}
                    >
                      <div className="flex items-center gap-2">
                        Date assigned
                        {sortConfig.key === "created_at" && (
                          <ArrowUpDown className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMarks.map((mark) => (
                    <TableRow key={mark.mark_id}>
                      <TableCell className="font-medium">{mark.name}</TableCell>
                      <TableCell>{mark.phone || "N/A"}</TableCell>
                      <TableCell>{mark.email}</TableCell>
                      <TableCell>{mark.award}</TableCell>
                      <TableCell>{mark.year}</TableCell>
                      <TableCell className="font-semibold">{mark.marks}</TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatMarksAssignedAt(mark.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => openViewRemarks(mark)}
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                          View more
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 border-t px-4 py-4">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-base"
                  >
                    Previous
                  </Button>
                  {pageNumbers.map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "outline" : "ghost"}
                      onClick={() => setCurrentPage(page)}
                      className="h-11 min-w-11 text-base"
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="text-base"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open)
          if (!open) {
            setViewRow(null)
            setViewSnapshot(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Marks details</DialogTitle>
            <DialogDescription>
              Application record for {viewRow?.name ?? "applicant"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center border-b pb-5 pt-1">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border bg-white shadow-sm">
              <Image
                src={NAST_LOGO}
                alt="NAST"
                fill
                className="object-contain p-1"
                sizes="64px"
                priority
              />
            </div>
            <p className="mt-3 text-center text-sm font-semibold leading-snug text-red-600">
              {"Nepal Academy of Science & Technology"}
            </p>
            <p className="text-center text-xs font-medium text-red-600">(Central Office)</p>
            <p className="mt-2 text-lg font-bold tracking-wide underline decoration-2 underline-offset-4">
              NAST
            </p>
            <p className="mt-3 text-sm font-medium text-muted-foreground">Marks details</p>
          </div>

          {viewLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading details…</span>
            </div>
          ) : viewRow && viewSnapshot ? (
            <dl className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Application ID</dt>
                <dd className="font-mono tabular-nums">{viewRow.application_id}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Name</dt>
                <dd>{viewRow.name}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Phone no.</dt>
                <dd>{viewRow.phone || "N/A"}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Email</dt>
                <dd className="break-all">{viewRow.email}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Award name</dt>
                <dd>{viewRow.award}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Year</dt>
                <dd>{viewRow.year}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Marks assigned</dt>
                <dd>{formatMarksAssignedAt(viewRow.created_at)}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="font-medium text-muted-foreground">Assigned marks</dt>
                <dd className="text-lg font-bold tabular-nums text-rose-600">{viewSnapshot.marks}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2 pt-1">
                <dt className="font-medium text-muted-foreground">Remarks</dt>
                <dd className="rounded-md border bg-muted/40 p-3 whitespace-pre-wrap text-foreground min-h-[3.5rem]">
                  {viewSnapshot.remarks?.trim() ? viewSnapshot.remarks : "—"}
                </dd>
              </div>
            </dl>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={viewLoading || !viewRow || !viewSnapshot}
              onClick={handleDownloadPdfFromDialog}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

