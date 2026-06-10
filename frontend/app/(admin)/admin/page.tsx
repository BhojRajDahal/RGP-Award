"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Trophy, FileCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import InteractiveNepalMap from "@/components/ui/InteractiveNepalMap"
import { useEffect, useState } from "react"
import { apiClient, API_BASE_URL } from "@/lib/api-client"
import { prizesFromApiResponse } from "@/lib/prize-list-response"
import { itemsFromPagedApiResponse } from "@/lib/paged-api-response"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTranslation } from "@/lib/i18n-context"


interface Prize {
  prize_id?: number
  id?: string
  title: string
  description?: string
  open_date?: string
  close_date?: string
  deadline?: string
  is_active?: boolean
  status?: string
}

export default function AdminDashboard() {
  const { user, token } = useAuth({ requireAuth: true, requireAdmin: true })
  const { t } = useTranslation()

  // ----------- PRIZE FORM STATE -----------
  const [prizeForm, setPrizeForm] = useState({
    title: "",
    description: "",
    open_date: "",
    close_date: "",
    is_active: true,
  })

  const [isSubmittingPrize, setIsSubmittingPrize] = useState(false)
  const [isPrizeDialogOpen, setIsPrizeDialogOpen] = useState(false)

  // ----------- PRIZE LIST STATE -----------
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [isLoadingPrizes, setIsLoadingPrizes] = useState(false)
  const [prizeListError, setPrizeListError] = useState("")

  // ----------- STATISTICS STATE -----------
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [totalApplications, setTotalApplications] = useState<number>(0)
  const [pendingApplications, setPendingApplications] = useState<number>(0)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // ----------- FETCH PRIZES -----------
  const fetchPrizes = async () => {
    setIsLoadingPrizes(true)
    setPrizeListError("")

    try {
      // Get token from localStorage directly (matching AdminPanel pattern)
      const adminToken = typeof window !== "undefined" 
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        setPrizeListError("No authentication token found")
        setPrizes([])
        setIsLoadingPrizes(false)
        return
      }

      const response = await apiClient.get("/api/prize?limit=100&page=1", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      setPrizes(prizesFromApiResponse(response.data) as Prize[])
      setPrizeListError("")
    } catch (err: any) {
      console.error("Error fetching awards:", err)
      setPrizeListError("Failed to load awards.")
      setPrizes([])
      
      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        toast.error("Cannot connect to backend server")
      } else if (err.response?.status === 401) {
        toast.error("Authentication failed. Please login again.")
      } else {
        toast.error(err.response?.data?.msg || "Failed to fetch awards")
      }
    } finally {
      setIsLoadingPrizes(false)
    }
  }

  // ----------- FETCH STATISTICS -----------
  const fetchStatistics = async () => {
    setIsLoadingStats(true)
    try {
      const adminToken = typeof window !== "undefined" 
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        setIsLoadingStats(false)
        return
      }

      // Fetch users count
      try {
        const usersResponse = await apiClient.get("/api/admin/users", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        const users = Array.isArray(usersResponse.data) ? usersResponse.data : []
        setTotalUsers(users.length)
      } catch (err: any) {
        console.error("Error fetching users for statistics:", err)
        if (err.response) {
          console.error("Error response data:", err.response.data)
          console.error("Error status:", err.response.status)
        }
        // Keep 0 on error (initial state) - user can check console for details
      }

      // Fetch applications count
      try {
        const applicationsResponse = await apiClient.get("/api/application?limit=100&page=1", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        const applications = itemsFromPagedApiResponse(applicationsResponse.data)
        setTotalApplications(applications.length)
        
        // Count pending applications (status: 'submitted' or 'processing')
        const pending = applications.filter((app: any) => {
          const status = app.status?.toLowerCase()
          return status === 'submitted' || status === 'processing'
        }).length
        setPendingApplications(pending)
      } catch (err: any) {
        console.error("Error fetching applications:", err)
        setTotalApplications(0)
        setPendingApplications(0)
      }
    } catch (err: any) {
      console.error("Error fetching statistics:", err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchPrizes()
    fetchStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Export Report functionality
  const handleExportReport = async () => {
    try {
      const adminToken = typeof window !== "undefined" 
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      // Fetch users data
      const usersResponse = await apiClient.get("/api/admin/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      const users = Array.isArray(usersResponse.data) ? usersResponse.data : usersResponse.data?.data || []

      // Create CSV content
      const headers = ["ID", "Name", "Email", "Role", "Joined Date", "Status", "Total Applications"]
      const rows = users.map((u: any) => [
        u.id || u.user_id || "-",
        u.name || u.full_name || "-",
        u.email || "-",
        u.role || "User",
        u.createdAt || u.joined_date || "-",
        u.status || "Active",
        u.application_count || 0,
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n")

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `user-report-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Report exported successfully")
    } catch (error: any) {
      console.error("Error exporting report:", error)
      toast.error("Failed to export report")
    }
  }

  // ----------- FORM CHANGE HANDLER -----------
  const handlePrizeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setPrizeForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  // ----------- SUBMIT NEW PRIZE -----------
  const handlePrizeSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmittingPrize(true)

    try {
      // Get token from localStorage directly (matching AdminPanel pattern)
      const adminToken = typeof window !== "undefined" 
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        toast.error("Authentication required. Please login again.")
        setIsSubmittingPrize(false)
        return
      }

      const response = await apiClient.post("/api/prize", prizeForm, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      toast.success(response.data?.msg || "Award created successfully")
      setPrizeForm({
        title: "",
        description: "",
        open_date: "",
        close_date: "",
        is_active: true,
      })
      setIsPrizeDialogOpen(false)
      fetchPrizes()
    } catch (err: any) {
      console.error("Error creating award:", err)
      
      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        toast.error("Cannot connect to backend server. Please ensure the server is running.")
      } else if (err.response?.status === 404) {
        toast.error("Award API endpoint not found. Backend may need to be updated.")
      } else if (err.response?.status === 401) {
        toast.error("Authentication expired. Please login again.")
      } else {
        const errorMsg = err.response?.data?.message || err.response?.data?.msg || err.message || "Failed to create award"
        toast.error(errorMsg)
      }
    } finally {
      setIsSubmittingPrize(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{t("admin.portal")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground break-words">
            {t("admin.welcome")}, {user?.full_name || "Admin"}. {t("admin.manage")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <Button variant="outline" onClick={handleExportReport} className="text-xs sm:text-sm">{t("admin.export_reports")}</Button>
          <Dialog open={isPrizeDialogOpen} onOpenChange={setIsPrizeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="text-xs sm:text-sm">{t("admin.create_prize")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Award</DialogTitle>
                <DialogDescription>
                  Add a new award to the system. Fill in all required fields.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePrizeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={prizeForm.title}
                    onChange={handlePrizeChange}
                    required
                    placeholder="Enter award title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={prizeForm.description}
                    onChange={handlePrizeChange}
                    placeholder="Enter award description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="open_date">Open Date *</Label>
                    <Input
                      id="open_date"
                      name="open_date"
                      type="date"
                      value={prizeForm.open_date}
                      onChange={handlePrizeChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="close_date">Close Date *</Label>
                    <Input
                      id="close_date"
                      name="close_date"
                      type="date"
                      value={prizeForm.close_date}
                      onChange={handlePrizeChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    name="is_active"
                    checked={prizeForm.is_active}
                    onCheckedChange={(checked) =>
                      setPrizeForm((prev) => ({ ...prev, is_active: checked as boolean }))
                    }
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active
                  </Label>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPrizeDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingPrize}>
                    {isSubmittingPrize ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Award"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.total_users")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                totalUsers.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.active_prizes")}</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingPrizes ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                Array.isArray(prizes) ? prizes.filter((p) => p.is_active !== false).length : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {Array.isArray(prizes) ? prizes.length : 0} {t("admin.total_prizes")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.pending_applications")}</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                pendingApplications
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.requires_review")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                totalApplications.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">All time applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Nepal Map */}
      <InteractiveNepalMap
        stats={{
          totalUsers: totalUsers,
          totalApplications: totalApplications,
          totalPrizes: Array.isArray(prizes) ? prizes.length : 0,
        }}
        awards={prizes}
        onDistrictSelect={(district) => {
          console.log("Selected district:", district)
          // You can add navigation or filtering logic here
        }}
      />

      {/* Award list (API: /api/prize) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.prize_management")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPrizes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading awards...</span>
            </div>
          ) : prizeListError ? (
            <div className="text-center py-8 text-destructive">{prizeListError}</div>
          ) : !Array.isArray(prizes) || prizes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No awards found.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <div className="min-w-[600px]">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Open Date</TableHead>
                    <TableHead>Close Date</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(prizes) && prizes.map((prize) => (
                    <TableRow key={prize.prize_id || prize.id}>
                      <TableCell>{prize.prize_id || prize.id}</TableCell>
                      <TableCell className="font-medium">{prize.title}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {prize.description || "-"}
                      </TableCell>
                      <TableCell>
                        {prize.open_date
                          ? new Date(prize.open_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {prize.close_date || prize.deadline
                          ? new Date(prize.close_date || prize.deadline!).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {prize.is_active !== false ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.recent_applications")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">U{i}</div>
                    <div>
                      <p className="font-medium">Applicant Name {i}</p>
                      <p className="text-sm text-muted-foreground">Applied for: Young Scientist Award</p>
                    </div>
                  </div>
                  <Link href="/admin/applications">
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.quick_actions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/admin/prizes" className="w-full">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 bg-transparent hover:bg-accent">
                  <Trophy className="h-6 w-6" />
                  {t("admin.add_new_prize")}
                </Button>
              </Link>
              <Link href="/admin/users" className="w-full">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 bg-transparent hover:bg-accent">
                  <Users className="h-6 w-6" />
                  {t("admin.manage_users")}
                </Button>
              </Link>
              <Link href="/admin/applications" className="w-full">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 bg-transparent hover:bg-accent">
                  <FileCheck className="h-6 w-6" />
                  {t("admin.bulk_review")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
