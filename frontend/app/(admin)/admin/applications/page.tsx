"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Filter, Download, User, FileText, Mail, Phone, Loader2, Send, MoreVertical, Plus, Trash2, CheckCircle2 } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n-context"
import { apiClient } from "@/lib/api-client"
import { itemsFromPagedApiResponse } from "@/lib/paged-api-response"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Application {
  application_id: number
  user_id: number
  prize_id: number
  status: string
  submitted_at?: string
  created_at?: string
  updated_at?: string
  user?: {
    full_name: string
    email: string
  }
  prize?: {
    prize_name: string
  }
  user_name?: string  // Keep for backward compatibility
  user_email?: string // Keep for backward compatibility
  prize_title?: string // Keep for backward compatibility
  common_field_values?: any[]
  prize_specific_field_values?: any[]
  specific_field_values?: any[]
}

interface ApplicationDisplay {
  id: string
  application_id: number
  user_id?: number
  applicant: string
  email: string
  phone?: string
  address?: string
  prize: string
  date: string
  /** Calendar year from submission timestamp, for filtering */
  submittedYear: number | null
  status: string
  details?: string
  documents?: string[]
  profilePicture?: string
  applicationCount?: number
}

const APPLICATIONS_PER_PAGE = 10

export default function AdminApplicationsPage() {
  const { t } = useTranslation()
  const [applications, setApplications] = useState<ApplicationDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")
  const [awardFilter, setAwardFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [applicantProfile, setApplicantProfile] = useState<ApplicationDisplay | null>(null)
  const [userProfileData, setUserProfileData] = useState<any>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; applicationId: number | null; action: string | null }>({
    open: false,
    applicationId: null,
    action: null,
  })
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; applicationId: number | null; userEmail: string | null }>({
    open: false,
    applicationId: null,
    userEmail: null,
  })
  const [emailMessage, setEmailMessage] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [assignMarksDialog, setAssignMarksDialog] = useState<{ open: boolean; applicationId: number | null }>({
    open: false,
    applicationId: null,
  })
  const [markInputs, setMarkInputs] = useState<string[]>(["", ""])
  const [averageMarks, setAverageMarks] = useState<string>("")
  const [remarks, setRemarks] = useState("")
  const [isSubmittingMarks, setIsSubmittingMarks] = useState(false)
  const [marksConfirmDialog, setMarksConfirmDialog] = useState<{ open: boolean; averageMarks: string }>({
    open: false,
    averageMarks: "",
  })
  const [marksSuccessDialog, setMarksSuccessDialog] = useState<{ open: boolean }>({
    open: false,
  })
  const [applicationsWithMarks, setApplicationsWithMarks] = useState<Set<number>>(new Set())

  // Map database status to UI status
  const mapStatusToUI = (status: string): string => {
    const statusMap: Record<string, string> = {
      'submitted': 'Pending',
      'processing': 'Under Review',
      'accepted': 'Approved',
      'declined': 'Rejected',
      'draft': 'Draft'
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Map UI status to database status
  const mapUIToStatus = (uiStatus: string): string => {
    const statusMap: Record<string, string> = {
      'Pending': 'submitted',
      'Under Review': 'processing',
      'Approved': 'accepted',
      'Rejected': 'declined',
      'Draft': 'draft'
    }
    return statusMap[uiStatus] || uiStatus.toLowerCase()
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  const submissionYearFromRaw = (dateString: string | undefined): number | null => {
    if (!dateString) return null
    const date = new Date(dateString)
    const y = date.getFullYear()
    return Number.isFinite(y) && !Number.isNaN(date.getTime()) ? y : null
  }

  // Get file URL - handle both proxy and direct backend access
  const getFileUrl = (filePath: string) => {
    if (!filePath) {
      console.warn('[getFileUrl] Empty file path')
      return "#"
    }
    
    // Remove 'public/' prefix if present
    const cleanPath = filePath.replace(/^public\//, '')
    
    // Determine base URL
    // If NEXT_PUBLIC_API_BASE_URL is set and is a full URL, use it directly
    // Otherwise, use relative path which will be proxied by Next.js rewrites
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL
    let fullUrl: string
    
    if (rawBase && rawBase.includes('http')) {
      // Direct backend URL (e.g., http://localhost:5000)
      fullUrl = `${rawBase}/api/files/${cleanPath}`
    } else {
      // Relative path - Next.js will proxy /api/* to backend
      fullUrl = `/api/files/${cleanPath}`
    }
    
    console.log('[getFileUrl]', {
      original: filePath,
      cleaned: cleanPath,
      fullUrl: fullUrl,
      baseUrl: rawBase || 'relative (proxied)'
    })
    
    return fullUrl
  }

  const getAwardSpecificFieldValues = (app: any) =>
    app?.prize_specific_field_values || app?.specific_field_values || []

  // Fetch applications
  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get("/api/application?limit=100&page=1")

        const apps = itemsFromPagedApiResponse<Application>(response.data)
        const formattedApps: ApplicationDisplay[] = apps.map((app) => {
          const rawSubmitted = (app.submitted_at || app.created_at) || ""
          return {
            id: `APP-${String(app.application_id).padStart(3, '0')}`,
            application_id: app.application_id,
            user_id: app.user_id,
            applicant: app.user?.full_name || app.user_name || "Unknown User",
            email: app.user?.email || app.user_email || "",
            prize: app.prize?.prize_name || app.prize_title || "Unknown Award",
            date: formatDate(rawSubmitted),
            submittedYear: submissionYearFromRaw(rawSubmitted),
            status: mapStatusToUI(app.status),
          }
        })

        setApplications(formattedApps)

        // Check which applications have marks assigned
        const marksSet = new Set<number>()
        await Promise.all(
          formattedApps.map(async (app) => {
            try {
              const marksResponse = await apiClient.get(`/api/application/${app.application_id}/marks`)
              if (marksResponse.data && marksResponse.data.length > 0) {
                marksSet.add(app.application_id)
              }
            } catch (error) {
              // If marks don't exist or error, just continue (marks might not exist yet)
            }
          })
        )
        setApplicationsWithMarks(marksSet)
      } catch (error: any) {
        console.error("Error fetching applications:", error)
        toast.error(error.response?.data?.msg || "Failed to load applications")
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [])

  const awardOptions = useMemo(() => {
    const names = new Set<string>()
    for (const app of applications) {
      if (app.prize) names.add(app.prize)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [applications])

  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const app of applications) {
      if (app.submittedYear != null) years.add(app.submittedYear)
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [applications])

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (filter !== "All" && app.status !== filter) return false
      if (awardFilter !== "all" && app.prize !== awardFilter) return false
      if (yearFilter !== "all") {
        const y = Number.parseInt(yearFilter, 10)
        if (app.submittedYear !== y) return false
      }
      return true
    })
  }, [applications, filter, awardFilter, yearFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [filter, awardFilter, yearFilter])

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / APPLICATIONS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedApps = useMemo(() => {
    const startIndex = (currentPage - 1) * APPLICATIONS_PER_PAGE
    return filteredApps.slice(startIndex, startIndex + APPLICATIONS_PER_PAGE)
  }, [filteredApps, currentPage])

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  )

  const handleStatusUpdate = async (applicationId: number, newUIStatus: string) => {
    const dbStatus = mapUIToStatus(newUIStatus)
    const appId = String(applicationId)

    try {
      const response = await apiClient.patch(
        `/api/application/${appId}/status`,
        { status: dbStatus }
      )

      // Update local state
      setApplications((apps) =>
        apps.map((app) =>
          app.application_id === applicationId ? { ...app, status: newUIStatus } : app
        )
      )

      toast.success(`Application ${appId} marked as ${newUIStatus}`)
      setConfirmDialog({ open: false, applicationId: null, action: null })
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error(error.response?.data?.msg || "Failed to update application status")
    }
  }

  const handleActionClick = (applicationId: number, action: string) => {
    setConfirmDialog({ open: true, applicationId, action })
  }

  const handleAssignMarks = async (applicationId: number) => {
    // Check if marks already exist
    if (applicationsWithMarks.has(applicationId)) {
      toast.error("Marks have already been assigned to this application. Each application can only have marks assigned once.")
      return
    }

    setAssignMarksDialog({ open: true, applicationId })
    setMarkInputs(["", ""])
    setAverageMarks("")
    setRemarks("")
  }

  const handleAddMarkField = () => {
    setMarkInputs([...markInputs, ""])
  }

  const handleRemoveMarkField = (index: number) => {
    if (markInputs.length > 1) {
      const newInputs = markInputs.filter((_, i) => i !== index)
      setMarkInputs(newInputs)
      calculateAverage(newInputs)
    }
  }

  const handleMarkInputChange = (index: number, value: string) => {
    const newInputs = [...markInputs]
    newInputs[index] = value
    setMarkInputs(newInputs)
    calculateAverage(newInputs)
  }

  const calculateAverage = (inputs: string[]) => {
    const validMarks = inputs
      .map((input) => parseFloat(input))
      .filter((mark) => !isNaN(mark) && mark >= 0 && mark <= 100)
    
    if (validMarks.length > 0) {
      const sum = validMarks.reduce((acc, mark) => acc + mark, 0)
      const avg = sum / validMarks.length
      setAverageMarks(avg.toFixed(2))
    } else {
      setAverageMarks("")
    }
  }

  const handleSubmitMarks = () => {
    if (!averageMarks || averageMarks === "") {
      toast.error("Please enter at least one valid mark")
      return
    }
    
    const avgValue = parseFloat(averageMarks)
    if (isNaN(avgValue) || avgValue < 0 || avgValue > 100) {
      toast.error("Average marks must be between 0 and 100")
      return
    }

    setMarksConfirmDialog({ open: true, averageMarks })
  }

  const handleConfirmSubmitMarks = async () => {
    if (!assignMarksDialog.applicationId) {
      toast.error("Application ID is missing")
      return
    }

    setIsSubmittingMarks(true)
    try {
      const avgValue = parseFloat(averageMarks)
      const payload: { marks: number; remarks?: string } = {
        marks: avgValue,
      }

      if (remarks.trim()) {
        payload.remarks = remarks.trim()
      }

      const response = await apiClient.post(
        `/api/application/${assignMarksDialog.applicationId}/marks`,
        payload
      )

      // Close confirmation dialog first
      setMarksConfirmDialog({ open: false, averageMarks: "" })
      
      // Mark this application as having marks assigned
      if (assignMarksDialog.applicationId) {
        setApplicationsWithMarks((prev) => new Set(prev).add(assignMarksDialog.applicationId!))
      }
      
      // Close assign marks dialog and reset form
      setAssignMarksDialog({ open: false, applicationId: null })
      setMarkInputs(["", ""])
      setAverageMarks("")
      setRemarks("")
      
      // Show success popup dialog
      setMarksSuccessDialog({ open: true })
    } catch (error: any) {
      console.error("Error assigning marks:", error)
      toast.error(error.response?.data?.msg || "Failed to assign marks")
    } finally {
      setIsSubmittingMarks(false)
    }
  }

  const handleConfirmAction = async () => {
    if (confirmDialog.applicationId && confirmDialog.action) {
      if (confirmDialog.action === "Rejected") {
        // Avoid calling user-only application detail endpoint here.
        // Admin list data already includes applicant email for composing the message.
        const appFromList = applications.find((app) => app.application_id === confirmDialog.applicationId)
        const fallbackEmail = appFromList?.email || null

        setEmailDialog({
          open: true,
          applicationId: confirmDialog.applicationId,
          userEmail: fallbackEmail,
        })
        setEmailMessage("") // Start with empty message
        setConfirmDialog({ open: false, applicationId: null, action: null })
      } else {
        // For approved applications, directly update status (email will be sent automatically)
        handleStatusUpdate(confirmDialog.applicationId, confirmDialog.action)
        setConfirmDialog({ open: false, applicationId: null, action: null })
      }
    }
  }

  const handleSendRejectionEmail = async () => {
    if (!emailDialog.applicationId || !emailMessage.trim()) {
      toast.error("Please enter an email message")
      return
    }

    setIsSendingEmail(true)
    try {
      // First update the status to rejected
      await handleStatusUpdate(emailDialog.applicationId, "Rejected")

      // Then send the custom email (optional - don't fail if email fails)
      try {
        const response = await apiClient.post(
          `/api/application/${emailDialog.applicationId}/send-email`,
          { email_message: emailMessage }
        )

        if (response.data.warning) {
          // Email failed but status was updated
          toast.warning(response.data.warning || "Application rejected, but email could not be sent", { duration: 8000 })
        } else {
          toast.success(response.data.msg || "Application rejected and email sent successfully")
        }
        
        setEmailDialog({ open: false, applicationId: null, userEmail: null })
        setEmailMessage("")
      } catch (emailError: any) {
        // Email failed but status was already updated
        const errorMsg = emailError.response?.data?.msg || emailError.message || "Failed to send email"
        
        if (errorMsg.includes("authentication") || errorMsg.includes("BadCredentials") || errorMsg.includes("App Password") || errorMsg.includes("Username and Password not accepted")) {
          toast.warning(
            "Application rejected successfully, but email could not be sent. Please configure Gmail App Password in server .env file. See server console for setup instructions.",
            { duration: 10000 }
          )
        } else {
          toast.warning(`Application rejected successfully, but email could not be sent: ${errorMsg}`, { duration: 8000 })
        }
        
        setEmailDialog({ open: false, applicationId: null, userEmail: null })
        setEmailMessage("")
      }
    } catch (error: any) {
      console.error("Error updating application status:", error)
      toast.error(error.response?.data?.msg || "Failed to update application status")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleViewApplicant = async (app: ApplicationDisplay) => {
    setApplicantProfile(app)
    setIsProfileOpen(true)
    setIsProfileLoading(true)
    
    // Get user_id from the application (we stored it when fetching applications)
    let user_id = app.user_id

    // If user_id is not available, fetch it from the application details
    if (!user_id) {
      try {
        const appResponse = await apiClient.get(`/api/application/${app.application_id}`)
        user_id = appResponse.data?.user_id
      } catch (error: any) {
        console.error("Error fetching application:", error)
        toast.error("Could not find user ID")
        setIsProfileLoading(false)
        return
      }
    }

    if (!user_id) {
      toast.error("Could not find user ID")
      setIsProfileLoading(false)
      return
    }

    try {
      // Fetch user profile with all applications and field values
      const profileResponse = await apiClient.get(`/api/application/user/${user_id}/profile`)

      setUserProfileData(profileResponse.data)
    } catch (error: any) {
      console.error("Error fetching user profile:", error)
      toast.error(error.response?.data?.msg || "Failed to load user profile")
    } finally {
      setIsProfileLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ["ID", "Applicant", "Email", "Award", "Date", "Status", "Marks"]
    const rows = filteredApps.map((app) => [
      app.id,
      app.applicant,
      app.email,
      app.prize,
      app.date,
      app.status,
      applicationsWithMarks.has(app.application_id) ? t("admin.applications.marks_assigned") : "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `applications-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("CSV exported successfully")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.applications.title")}</h1>
          <p className="text-muted-foreground">{t("admin.applications.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> {t("admin.applications.export_csv")}
          </Button>
          <Select value={awardFilter} onValueChange={setAwardFilter}>
            <SelectTrigger className="w-[min(100%,12rem)] sm:w-[12rem]">
              <SelectValue placeholder={t("admin.applications.filter_award")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.applications.all_awards")}</SelectItem>
              {awardOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[min(100%,8rem)] sm:w-[8.5rem]">
              <SelectValue placeholder={t("admin.applications.filter_year")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.applications.all_years")}</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[min(100%,11rem)] sm:w-[11rem]">
              <Filter className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue placeholder={t("admin.applications.filter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{t("admin.applications.all")}</SelectItem>
              <SelectItem value="Pending">{t("admin.applications.pending")}</SelectItem>
              <SelectItem value="Under Review">{t("admin.applications.under_review")}</SelectItem>
              <SelectItem value="Approved">{t("admin.applications.approved")}</SelectItem>
              <SelectItem value="Rejected">{t("admin.applications.rejected")}</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>A list of all recent applications requiring review.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading applications...</span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No applications found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Award</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t("admin.applications.marks")}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.id}</TableCell>
                      <TableCell>
                        <div 
                          className="font-medium cursor-pointer hover:text-primary hover:underline"
                          onClick={() => handleViewApplicant(app)}
                        >
                          {app.applicant}
                        </div>
                        <div className="text-xs text-muted-foreground">{app.email}</div>
                      </TableCell>
                      <TableCell>{app.prize}</TableCell>
                      <TableCell>{app.date}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            app.status === "Approved"
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : app.status === "Rejected"
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
                          }
                        >
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {applicationsWithMarks.has(app.application_id) ? (
                          <Badge className="bg-rose-400 text-white hover:bg-rose-500 border-0">
                            {t("admin.applications.marks_assigned")}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {app.status !== "Approved" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleActionClick(app.application_id, "Approved")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {app.status !== "Rejected" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleActionClick(app.application_id, "Rejected")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleAssignMarks(app.application_id)}
                                disabled={applicationsWithMarks.has(app.application_id)}
                                className={applicationsWithMarks.has(app.application_id) ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                Assign Marks
                                {applicationsWithMarks.has(app.application_id) && " (Already Assigned)"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
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

      {/* Applicant Profile Dialog - Improved Layout */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-[90vw] w-full sm:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Custom Scrollable Content Area with styled scrollbar */}
          <div className="overflow-y-auto overflow-x-hidden px-6 sm:px-8 lg:px-10 py-6 sm:py-8 custom-scrollbar flex-1 min-h-0">
            <DialogHeader className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border/40">
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl font-bold">
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
                Applicant Profile
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base mt-2 text-muted-foreground break-words">
                Complete information about {applicantProfile?.applicant || userProfileData?.user?.full_name}
              </DialogDescription>
            </DialogHeader>
            {isProfileLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Loading profile...</span>
              </div>
            ) : userProfileData ? (
              <div className="space-y-8 sm:space-y-10 pt-4 sm:pt-6 pb-6 sm:pb-8 w-full">
                {/* Profile Header Section */}
                {(() => {
                // Extract profile picture from all applications
                let profilePicture: string | null = null
                if (userProfileData.applications && userProfileData.applications.length > 0) {
                  for (const app of userProfileData.applications) {
                    // Check common fields
                    if (app.common_field_values) {
                      for (const field of app.common_field_values) {
                        if (field.file_path) {
                          const fieldName = (field.field_name || '').toLowerCase()
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(field.file_path)
                          if (isImage && (fieldName.includes('photo') || fieldName.includes('picture') || fieldName.includes('profile') || fieldName.includes('image') || fieldName.includes('avatar'))) {
                            profilePicture = field.file_path
                            console.log('[Profile] Found profile picture:', profilePicture)
                            break
                          }
                        }
                      }
                    }
                    // Check prize-specific fields
                    const awardSpecificFields = getAwardSpecificFieldValues(app)
                    if (!profilePicture && awardSpecificFields.length > 0) {
                      for (const field of awardSpecificFields) {
                        if (field.file_path) {
                          const fieldName = (field.field_name || '').toLowerCase()
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(field.file_path)
                          if (isImage && (fieldName.includes('photo') || fieldName.includes('picture') || fieldName.includes('profile') || fieldName.includes('image') || fieldName.includes('avatar'))) {
                            profilePicture = field.file_path
                            console.log('[Profile] Found profile picture:', profilePicture)
                            break
                          }
                        }
                      }
                    }
                    if (profilePicture) break
                  }
                }
                if (!profilePicture) {
                  console.log('[Profile] No profile picture found, using fallback')
                }
                  return (
                    <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 lg:gap-10 pb-6 sm:pb-8 border-b-2 border-border/40 mb-6 sm:mb-8">
                      <div className="flex-1 space-y-3 sm:space-y-4 w-full">
                        <div>
                          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-foreground">{userProfileData.user.full_name}</h2>
                          <div className="space-y-2 text-sm sm:text-base">
                            <p className="text-muted-foreground flex items-center gap-2 sm:gap-3">
                              <Mail className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                              <span className="break-words">{userProfileData.user.email}</span>
                            </p>
                            <p className="text-muted-foreground">UID-{userProfileData.user.uid}</p>
                            <p className="text-muted-foreground">Member Since: {formatDate(userProfileData.user.created_at)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48 shrink-0 rounded-xl overflow-hidden bg-muted border-4 border-background shadow-lg flex items-center justify-center mx-auto sm:mx-0">
                        <Avatar className="h-full w-full rounded-xl">
                          {profilePicture ? (
                            <AvatarImage 
                              src={getFileUrl(profilePicture)} 
                              alt={userProfileData.user.full_name}
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary text-primary-foreground text-6xl font-semibold rounded-xl">
                            {userProfileData.user.full_name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  )
                })()}

                {/* User Basic Info Card */}
                <Card className="p-4 sm:p-6 bg-card">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                        <p className="text-base sm:text-lg font-semibold break-words">{userProfileData.user.full_name}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-base sm:text-lg flex items-center gap-2 break-words">
                          <Mail className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                          <span>{userProfileData.user.email}</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">User ID</p>
                        <p className="text-base sm:text-lg font-mono break-words">UID-{userProfileData.user.uid}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                        <p className="text-base sm:text-lg">{formatDate(userProfileData.user.created_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Applications Card */}
                <Card className="p-4 sm:p-6 bg-card">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl">Application Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2">
                        {userProfileData.total_applications} Application{userProfileData.total_applications !== 1 ? 's' : ''} Submitted
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* All Applications with Field Values - Organized by Award */}
                <Card className="p-4 sm:p-6 bg-card">
                  <CardHeader className="pb-4 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2 sm:gap-3">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                      All Applications & Submitted Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                {userProfileData.applications && userProfileData.applications.length > 0 ? (
                  (() => {
                    // Group applications by prize_id or prize_title
                    const groupedByPrize: { [key: string]: any[] } = {}
                    userProfileData.applications.forEach((app: any) => {
                      const prizeKey = app.prize_id || app.prize_title || "Unknown Award"
                      if (!groupedByPrize[prizeKey]) {
                        groupedByPrize[prizeKey] = []
                      }
                      groupedByPrize[prizeKey].push(app)
                    })

                    return (
                      <Accordion type="single" collapsible className="w-full space-y-3">
                        {Object.entries(groupedByPrize).map(([prizeKey, prizeApplications]) => {
                          const prizeTitle = prizeApplications[0]?.prize_title || prizeKey
                          
                          // Get all statuses for this award
                          const statuses = prizeApplications.map((app: any) => mapStatusToUI(app.status))
                          const hasApproved = statuses.includes("Approved")
                          const hasRejected = statuses.includes("Rejected")
                          const hasPending = statuses.includes("Pending") || statuses.includes("Under Review")
                          
                          return (
                            <AccordionItem key={prizeKey} value={prizeKey} className="border-2 border-border rounded-xl px-3 sm:px-4 lg:px-5 bg-card shadow-sm hover:shadow-md transition-shadow">
                              <AccordionTrigger className="hover:no-underline py-3 sm:py-4 lg:py-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-2 sm:pr-4 gap-2 sm:gap-0">
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                    <span className="font-semibold text-base sm:text-lg break-words">{prizeTitle}</span>
                                    <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                                      ({prizeApplications.length} application{prizeApplications.length !== 1 ? 's' : ''})
                                    </span>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {hasApproved && (
                                      <Badge className="bg-green-500 text-white text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">Approved</Badge>
                                    )}
                                    {hasRejected && (
                                      <Badge className="bg-red-500 text-white text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">Rejected</Badge>
                                    )}
                                    {hasPending && (
                                      <Badge className="bg-yellow-500 text-white text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">Pending</Badge>
                                    )}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                                <div className="space-y-4 sm:space-y-6">
                                  {prizeApplications.map((app: any, appIdx: number) => {
                                    // Extract profile picture to exclude it from documents
                                    let profilePicturePath: string | null = null
                                    if (app.common_field_values) {
                                      for (const field of app.common_field_values) {
                                        if (field.file_path) {
                                          const fieldName = (field.field_name || '').toLowerCase()
                                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(field.file_path)
                                          if (isImage && (fieldName.includes('photo') || fieldName.includes('picture') || fieldName.includes('profile') || fieldName.includes('image') || fieldName.includes('avatar'))) {
                                            profilePicturePath = field.file_path
                                            break
                                          }
                                        }
                                      }
                                    }
                                    const awardSpecificFields = getAwardSpecificFieldValues(app)
                                    if (!profilePicturePath && awardSpecificFields.length > 0) {
                                      for (const field of awardSpecificFields) {
                                        if (field.file_path) {
                                          const fieldName = (field.field_name || '').toLowerCase()
                                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(field.file_path)
                                          if (isImage && (fieldName.includes('photo') || fieldName.includes('picture') || fieldName.includes('profile') || fieldName.includes('image') || fieldName.includes('avatar'))) {
                                            profilePicturePath = field.file_path
                                            break
                                          }
                                        }
                                      }
                                    }
                                    
                                    // Collect all documents from this application, excluding profile picture
                                    const documents: string[] = []
                                    if (app.common_field_values) {
                                      app.common_field_values.forEach((field: any) => {
                                        if (field.file_path && field.file_path !== profilePicturePath) {
                                          documents.push(field.file_path)
                                        }
                                      })
                                    }
                                    if (awardSpecificFields.length > 0) {
                                      awardSpecificFields.forEach((field: any) => {
                                        if (field.file_path && field.file_path !== profilePicturePath) {
                                          documents.push(field.file_path)
                                        }
                                      })
                                    }

                                    return (
                                      <div key={app.application_id || appIdx} className="bg-muted/50 p-4 sm:p-5 lg:p-6 rounded-xl border-2 border-border shadow-sm hover:shadow-md transition-shadow space-y-4 sm:space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 pb-3 sm:pb-4 border-b-2 border-border">
                                          <div className="space-y-1">
                                            <p className="font-semibold text-base sm:text-lg">Application #{String(app.application_id).padStart(3, '0')}</p>
                                            <p className="text-xs sm:text-sm text-muted-foreground">
                                              Submitted: {formatDate(app.submitted_at || app.created_at)}
                                            </p>
                                          </div>
                                          <Badge
                                            className={
                                              mapStatusToUI(app.status) === "Approved"
                                                ? "bg-green-500 text-white hover:bg-green-600 text-xs sm:text-sm px-2 sm:px-3 py-1 self-start sm:self-auto"
                                                : mapStatusToUI(app.status) === "Rejected"
                                                  ? "bg-red-500 text-white hover:bg-red-600 text-xs sm:text-sm px-2 sm:px-3 py-1 self-start sm:self-auto"
                                                  : "bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-50 text-xs sm:text-sm px-2 sm:px-3 py-1 self-start sm:self-auto"
                                            }
                                          >
                                            {mapStatusToUI(app.status)}
                                          </Badge>
                                        </div>

                                        {/* Common Fields */}
                                        {app.common_field_values && app.common_field_values.length > 0 && (
                                          <div className="space-y-2 sm:space-y-3">
                                            <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                                              Common Information
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                              {app.common_field_values.map((field: any, idx: number) => (
                                                <div key={idx} className="bg-background p-3 sm:p-4 rounded-lg border space-y-1.5">
                                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.field_name}</span>
                                                  <div className="mt-1">
                                                    {field.file_path ? (
                                                      <a 
                                                        href={getFileUrl(field.file_path)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-xs sm:text-sm text-primary hover:underline break-all font-medium"
                                                      >
                                                        {field.file_path.split('/').pop()}
                                                      </a>
                                                    ) : (
                                                      <span className="text-xs sm:text-sm text-foreground break-words">{field.value || "N/A"}</span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Prize-Specific Fields */}
                                        {awardSpecificFields.length > 0 && (
                                          <div className="space-y-2 sm:space-y-3">
                                            <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                                              Award-Specific Information
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                              {awardSpecificFields.map((field: any, idx: number) => (
                                                <div key={idx} className="bg-background p-3 sm:p-4 rounded-lg border space-y-1.5">
                                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.field_name}</span>
                                                  <div className="mt-1">
                                                    {field.file_path ? (
                                                      <a 
                                                        href={getFileUrl(field.file_path)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-xs sm:text-sm text-primary hover:underline break-all font-medium"
                                                      >
                                                        {field.file_path.split('/').pop()}
                                                      </a>
                                                    ) : (
                                                      <span className="text-xs sm:text-sm text-foreground break-words">{field.value || "N/A"}</span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Documents for this application */}
                                        {documents.length > 0 && (
                                          <div className="space-y-2 sm:space-y-3">
                                            <h4 className="text-xs sm:text-sm font-semibold text-foreground">Attached Files</h4>
                                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                              {documents.map((doc, idx) => (
                                                <a
                                                  key={idx}
                                                  href={getFileUrl(doc)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="h-16 w-24 sm:h-20 sm:w-32 bg-background rounded-lg flex items-center justify-center text-xs border-2 border-border hover:border-primary hover:bg-accent cursor-pointer transition-all p-2 sm:p-3 text-center break-all shadow-sm hover:shadow-md"
                                                >
                                                  <span className="line-clamp-2">{doc.split('/').pop()}</span>
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    )
                  })()
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No applications found</p>
                  )}
                  </CardContent>
                </Card>
              </div>
            ) : applicantProfile ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">Loading user profile...</p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">No profile data available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Actions */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "Approved" ? "Approve Application?" : "Reject Application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog.action === "Approved" ? "approve" : "reject"} application APP-{String(confirmDialog.applicationId || "").padStart(3, '0')}? 
              {confirmDialog.action === "Approved" 
                ? " An approval email will be sent automatically." 
                : " You will be able to compose a rejection email."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmDialog.action === "Rejected" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {confirmDialog.action === "Approved" ? "Approve" : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Marks Dialog */}
      <Dialog open={assignMarksDialog.open} onOpenChange={(open) => setAssignMarksDialog({ ...assignMarksDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Marks</DialogTitle>
            <DialogDescription>
              Enter marks for application APP-{String(assignMarksDialog.applicationId || "").padStart(3, '0')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Dynamic Mark Input Fields */}
            <div className="space-y-3">
              <Label>Marks</Label>
              {markInputs.map((mark, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Enter mark (0-100)"
                    value={mark}
                    onChange={(e) => handleMarkInputChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {markInputs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMarkField(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {index === markInputs.length - 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleAddMarkField}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Average Marks */}
            <div className="space-y-2">
              <Label htmlFor="average-marks">Average Marks</Label>
              <Input
                id="average-marks"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={averageMarks}
                readOnly
                className="bg-muted"
                placeholder="Will be calculated automatically"
              />
              <p className="text-xs text-muted-foreground">
                Average is calculated automatically after all marks are entered
              </p>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Enter any remarks or comments..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignMarksDialog({ open: false, applicationId: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitMarks}
              disabled={!averageMarks || averageMarks === ""}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Marks Submission */}
      <AlertDialog open={marksConfirmDialog.open} onOpenChange={(open) => setMarksConfirmDialog({ ...marksConfirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Marks Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to assign an average mark of <strong>{marksConfirmDialog.averageMarks}</strong> to application APP-{String(assignMarksDialog.applicationId || "").padStart(3, '0')}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmitMarks}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmittingMarks}
            >
              {isSubmittingMarks ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm & Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog for Marks Submission */}
      <AlertDialog open={marksSuccessDialog.open} onOpenChange={(open) => setMarksSuccessDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Submitted Successfully
            </AlertDialogTitle>
            <AlertDialogDescription>
              Marks have been successfully assigned to the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setMarksSuccessDialog({ open: false })}
              className="bg-green-600 hover:bg-green-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Composition Dialog for Rejected Applications */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => setEmailDialog({ ...emailDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Compose Rejection Email
            </DialogTitle>
            <DialogDescription>
              Write the rejection email to be sent to {emailDialog.userEmail || "the applicant"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">To</Label>
              <Input
                id="recipient"
                value={emailDialog.userEmail || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Email Message</Label>
              <Textarea
                id="email-message"
                placeholder="Dear Sir/Madam,&#10;&#10;Write your rejection message here...&#10;&#10;Best regards,&#10;System Administration Team"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmailDialog({ open: false, applicationId: null, userEmail: null })
                setEmailMessage("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendRejectionEmail}
              disabled={isSendingEmail || !emailMessage.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Reject & Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
