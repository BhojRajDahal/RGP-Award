"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Upload, ArrowRight, ArrowLeft, Loader2, Info, BookOpen } from "lucide-react"
import { useTranslation } from "@/lib/i18n-context"
import { apiClient } from "@/lib/api-client"
import { useAuth, type AuthUser } from "@/hooks/use-auth"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import Link from "next/link"

type FieldType = 'text' | 'textarea' | 'number' | 'file' | 'date' | 'label'

interface CommonField {
  common_field_id: number
  field_name: string
  field_type: FieldType
  is_required: boolean | number
}

interface PrizeSpecificField {
  prize_specific_field_id: number
  prize_id: number
  field_name: string
  field_type: FieldType
  is_required: boolean | number
}

interface FieldValue {
  common_field_id?: number
  prize_specific_field_id?: number
  value?: string
  file_path?: string
}

const MAX_FILE_SIZE_BYTES = 200 * 1024
const MAX_FILE_SIZE_LABEL = "200KB"
const formatFileSizeKB = (size: number) => `${(size / 1024).toFixed(1)}KB`
const isInputField = (field: CommonField | PrizeSpecificField) => field.field_type !== 'label'

export function ApplicationWizard({ prizeId }: { prizeId: string }) {
  const [step, setStep] = useState(1)
  const { t } = useTranslation()
  const { user, token, isChecking, isAuthenticated } = useAuth({ requireAuth: true })
  const [isLoading, setIsLoading] = useState(false)
  const [loadingFields, setLoadingFields] = useState(true)
  const router = useRouter()

  const [commonFields, setCommonFields] = useState<CommonField[]>([])
  const [prizeSpecificFields, setPrizeSpecificFields] = useState<PrizeSpecificField[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({})
  const [fileUploads, setFileUploads] = useState<Record<string, File>>({})
  const [isDeclarationChecked, setIsDeclarationChecked] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate total steps
  const totalSteps = prizeSpecificFields.length > 0 ? 3 : 2
  const commonFieldsStep = 1
  const prizeSpecificStep = prizeSpecificFields.length > 0 ? 2 : null
  const reviewStep = totalSteps

  // Fetch fields for the prize
  useEffect(() => {
    const fetchFields = async () => {
      setLoadingFields(true)
      try {
        console.log(`[ApplicationWizard] Fetching fields for prizeId: ${prizeId}`)
        
        // Fetch common fields (same for all prizes - no prize_id needed)
        // Path must include /api since baseURL may be http://localhost:5000 (not http://localhost:5000/api)
        const commonFieldsResponse = await apiClient.get(`/api/application/common-fields`)
        console.log(`[ApplicationWizard] Common fields response:`, commonFieldsResponse.data)
        
        // Fetch prize-specific fields (only for this prize)
        // Path must include /api since baseURL may be http://localhost:5000 (not http://localhost:5000/api)
        const prizeSpecificResponse = await apiClient.get(`/api/application/prize/${prizeId}/specific-fields`)
        console.log(`[ApplicationWizard] Prize-specific fields response:`, prizeSpecificResponse.data)
        
        const commonFieldsData = commonFieldsResponse.data?.common_fields || []
        const prizeSpecificFieldsData = prizeSpecificResponse.data?.prize_specific_fields || []
        
        console.log(`[ApplicationWizard] Found ${commonFieldsData.length} common fields`)
        console.log(`[ApplicationWizard] Found ${prizeSpecificFieldsData.length} prize-specific fields`)
        
        setCommonFields(commonFieldsData)
        setPrizeSpecificFields(prizeSpecificFieldsData)
        
        // Initialize field values
        const initialValues: Record<string, FieldValue> = {}
        commonFieldsData.forEach((field: CommonField) => {
          initialValues[`common_${field.common_field_id}`] = {
            common_field_id: field.common_field_id,
          }
        })
        prizeSpecificFieldsData.forEach((field: PrizeSpecificField) => {
          initialValues[`specific_${field.prize_specific_field_id}`] = {
            prize_specific_field_id: field.prize_specific_field_id,
          }
        })
        setFieldValues(initialValues)
      } catch (error: any) {
        console.error("Error fetching fields:", error)
        
        // Enhanced error handling
        if (error.response?.status === 404) {
          console.error("Route not found. Check if backend server is running and route is correct.")
          console.error("Expected URL: /api/application/common-fields or /api/application/prize/:prize_id/specific-fields")
          console.error("Actual request URL:", error.config?.url)
          console.error("Base URL:", error.config?.baseURL)
          console.error("Full URL would be:", `${error.config?.baseURL}${error.config?.url}`)
        }
        
        console.error("Error details:", error.response?.data || error.message)
        toast.error(error.response?.data?.msg || "Failed to load application fields. Please check if the server is running.")
      } finally {
        setLoadingFields(false)
      }
    }

    if (prizeId) {
      fetchFields()
    }
  }, [prizeId])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const handleNext = () => {
    // Validate current step before proceeding
    if (step === commonFieldsStep) {
      const currentFields = commonFields.filter(f => f.is_required && isInputField(f))
      const allFilled = currentFields.every(field => {
        const key = `common_${field.common_field_id}`
        const value = fieldValues[key]
        if (field.field_type === 'file') {
          return fileUploads[key] !== undefined
        }
        return value?.value && value.value.trim() !== ''
      })
      
      if (!allFilled) {
        toast.error("Please fill in all required fields")
        return
      }
    } else if (step === prizeSpecificStep && prizeSpecificStep) {
      const currentFields = prizeSpecificFields.filter(f => f.is_required && isInputField(f))
      const allFilled = currentFields.every(field => {
        const key = `specific_${field.prize_specific_field_id}`
        const value = fieldValues[key]
        if (field.field_type === 'file') {
          return fileUploads[key] !== undefined
        }
        return value?.value && value.value.trim() !== ''
      })
      
      if (!allFilled) {
        toast.error("Please fill in all required fields")
        return
      }
    }
    
    setStep(Math.min(step + 1, totalSteps))
  }

  const handleBack = () => setStep(Math.max(step - 1, 1))

  const handleFieldChange = (fieldId: string, value: string, isCommon: boolean) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [isCommon ? 'common_field_id' : 'prize_specific_field_id']: isCommon 
          ? parseInt(fieldId.replace('common_', ''))
          : parseInt(fieldId.replace('specific_', '')),
        value,
      }
    }))
  }

  const clearFileUpload = (fieldId: string) => {
    setFileUploads(prev => {
      const nextFileUploads = { ...prev }
      delete nextFileUploads[fieldId]
      return nextFileUploads
    })
  }

  const handleFileChange = async (fieldId: string, file: File | null, input?: HTMLInputElement) => {
    if (!file) {
      clearFileUpload(fieldId)
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      clearFileUpload(fieldId)
      if (input) {
        input.value = ""
      }
      toast.error(
        `File size exceeds ${MAX_FILE_SIZE_LABEL} limit. Selected file: ${formatFileSizeKB(file.size)}. ` +
        `Please upload a file that is ${MAX_FILE_SIZE_LABEL} or less.`
      )
      return
    }

    setFileUploads(prev => ({ ...prev, [fieldId]: file }))
    
    toast.info(
      `File selected. ${file.name} is ${formatFileSizeKB(file.size)} / ${MAX_FILE_SIZE_LABEL}.`
    )
  }

  const handleSubmit = async (e?: React.MouseEvent) => {
    // Prevent default form submission if called from a form
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Check if declaration checkbox is checked
    if (!isDeclarationChecked) {
      toast.error("Please tick the declaration checkbox to confirm that all information provided is accurate and true.")
      return
    }

    // Validate file size before submission
    const oversizedFile = Object.values(fileUploads).find(file => file.size > MAX_FILE_SIZE_BYTES)
    
    if (oversizedFile) {
      toast.error(
        `Each uploaded file must be ${MAX_FILE_SIZE_LABEL} or less. ` +
        `${oversizedFile.name} is ${formatFileSizeKB(oversizedFile.size)}.`
      )
      setIsLoading(false)
      return
    }

    console.log('[handleSubmit] Starting submission...')
    console.log('[handleSubmit] User:', user)
    console.log('[handleSubmit] isChecking:', isChecking)
    console.log('[handleSubmit] isAuthenticated:', isAuthenticated)
    console.log('[handleSubmit] Token:', !!token)
    console.log('[handleSubmit] PrizeId:', prizeId)
    
    // Wait for auth check to complete
    if (isChecking) {
      console.log('[handleSubmit] Still checking authentication, please wait...')
      toast.error("Please wait while we verify your authentication...")
      return
    }

    // Check authentication - try to get user from localStorage if hook doesn't provide it
    let currentUser = user
    if (!currentUser || Object.keys(currentUser).length === 0) {
      console.log('[handleSubmit] User from hook is empty, trying localStorage...')
      try {
        const storedUser = typeof window !== "undefined" 
          ? window.localStorage.getItem("nast_user")
          : null
        if (storedUser) {
          const parsed = JSON.parse(storedUser)
          console.log('[handleSubmit] Raw stored user string:', storedUser)
          console.log('[handleSubmit] Parsed user from localStorage:', parsed)
          currentUser = parsed
        }
      } catch (error) {
        console.error('[handleSubmit] Error parsing user from localStorage:', error)
      }
    }

    // If still no user, try to extract from JWT token
    if (!currentUser || Object.keys(currentUser).length === 0) {
      console.log('[handleSubmit] User still empty, trying to extract from JWT token...')
      const authToken = token || (typeof window !== "undefined" 
        ? window.localStorage.getItem("nast_token")
        : null)
      
      if (authToken) {
        try {
          // Decode JWT token (without verification, just to get user info)
          const base64Url = authToken.split('.')[1]
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            )
            const decoded = JSON.parse(jsonPayload)
            console.log('[handleSubmit] Decoded JWT:', decoded)
            
            // Create user object from JWT
            if (decoded.user_id || decoded.uid || decoded.id) {
              const userId = decoded.uid || decoded.user_id || decoded.id
              currentUser = {
                id: userId,
                user_id: userId,
                uid: userId, // Include uid for database compatibility
                email: decoded.email || '',
                full_name: decoded.full_name || decoded.name || '',
              } as AuthUser
              console.log('[handleSubmit] Created user from JWT:', currentUser)
            }
          }
        } catch (error) {
          console.error('[handleSubmit] Error decoding JWT:', error)
        }
      }
    }

    if (!isAuthenticated || !currentUser || Object.keys(currentUser).length === 0) {
      console.error('[handleSubmit] User not authenticated:', { user, currentUser, isAuthenticated })
      toast.error("User not authenticated. Please log out and log in again.")
      return
    }

    // Get user ID - try uid, id, and user_id fields (database uses uid)
    const userId = currentUser.uid || currentUser.id || currentUser.user_id
    if (!userId) {
      console.error('[handleSubmit] User ID not found in user object:', currentUser)
      toast.error("User information is incomplete. Please log out and log in again.")
      return
    }

    console.log('[handleSubmit] User ID found:', userId)

    setIsLoading(true)
    console.log('[handleSubmit] Loading state set to true')

    try {
      const fromStorage =
        typeof window !== "undefined"
          ? localStorage.getItem("nast_token") || localStorage.getItem("token")
          : null

      const looksLikeJwt = (t: string | null) =>
        !!t && t !== "cookie-session" && t.split(".").length === 3

      // useAuth sets token to "cookie-session" for httpOnly cookies. Sending
      // Authorization: Bearer cookie-session makes the API verify garbage → 401.
      // Omit Bearer so cookie-parser supplies access_token; only send Bearer if
      // localStorage holds a real JWT (legacy/mobile).
      const submitAuthHeaders: Record<string, string> = {}
      if (token !== "cookie-session" && looksLikeJwt(token ?? null)) {
        submitAuthHeaders.Authorization = `Bearer ${token}`
      } else if (looksLikeJwt(fromStorage)) {
        submitAuthHeaders.Authorization = `Bearer ${fromStorage}`
      }

      console.log('[handleSubmit] Auth mode:', {
        cookieSession: token === "cookie-session",
        bearerJwt: !!submitAuthHeaders.Authorization,
      })

      const sendsCookieAuth = token === "cookie-session"
      const sendsBearer = !!submitAuthHeaders.Authorization
      if (!(sendsCookieAuth || sendsBearer)) {
        console.error("[handleSubmit] No cookie session and no Bearer JWT")
        toast.error("Authentication token not found. Please log in again.")
        setIsLoading(false)
        return
      }

      // Prepare field values (without file_path - files will be sent separately)
      const commonFieldValues = commonFields.filter(isInputField).map(field => {
        const key = `common_${field.common_field_id}`
        const value = fieldValues[key]
        
        return {
          common_field_id: field.common_field_id,
          value: field.field_type !== 'file' ? (value?.value || '') : null,
        }
      })

      const specificFieldValues = prizeSpecificFields.filter(isInputField).map(field => {
        const key = `specific_${field.prize_specific_field_id}`
        const value = fieldValues[key]
        
        return {
          prize_specific_field_id: field.prize_specific_field_id,
          value: field.field_type !== 'file' ? (value?.value || '') : null,
        }
      })

      // Create FormData for multipart/form-data
      const formData = new FormData()
      
      // Add prize_id
      formData.append('prize_id', prizeId)
      
      // Add JSON data as form fields
      formData.append('common_field_values', JSON.stringify(commonFieldValues))
      formData.append('specific_field_values', JSON.stringify(specificFieldValues))
      
      // Add files with field names matching the field IDs
      commonFields.forEach(field => {
        const key = `common_${field.common_field_id}`
        const file = fileUploads[key]
        if (file && field.field_type === 'file') {
          if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`Each uploaded file must be ${MAX_FILE_SIZE_LABEL} or less. ${file.name} is ${formatFileSizeKB(file.size)}.`)
          }
          formData.append(key, file)
        }
      })
      
      prizeSpecificFields.forEach(field => {
        const key = `specific_${field.prize_specific_field_id}`
        const file = fileUploads[key]
        if (file && field.field_type === 'file') {
          if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`Each uploaded file must be ${MAX_FILE_SIZE_LABEL} or less. ${file.name} is ${formatFileSizeKB(file.size)}.`)
          }
          formData.append(key, file)
        }
      })

      console.log('[handleSubmit] FormData prepared:', {
        prize_id: prizeId,
        commonFieldsCount: commonFieldValues.length,
        specificFieldsCount: specificFieldValues.length,
        filesCount: Array.from(formData.entries()).filter(([key]) => 
          key.startsWith('common_') || key.startsWith('specific_')
        ).length
      })

      // Send FormData (don't set Content-Type header - browser will set it with boundary)
      console.log('[handleSubmit] Sending request to /api/application/submit')
      const response = await apiClient.post("/api/application/submit", formData, {
        headers: submitAuthHeaders,
      })

      console.log('[handleSubmit] Response received:', response.data)
      
      // Show success toast
      toast.success("Application submitted successfully!")
      
      // Show success dialog
      setShowSuccessDialog(true)
      
      // Reset form
      setFieldValues({})
      setFileUploads({})
      setStep(1)
      setIsDeclarationChecked(false)
      
      // Auto-redirect to dashboard after 3 seconds
      redirectTimeoutRef.current = setTimeout(() => {
        setShowSuccessDialog(false)
        router.push("/dashboard")
      }, 3000)
    } catch (error: any) {
      console.error("[handleSubmit] Error submitting application:", error)
      console.error("[handleSubmit] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      })
      toast.error(error.response?.data?.msg || error.message || "Failed to submit application. Please try again.")
    } finally {
      setIsLoading(false)
      console.log('[handleSubmit] Loading state set to false')
    }
  }

  const renderField = (field: CommonField | PrizeSpecificField, isCommon: boolean) => {
    const fieldId = isCommon 
      ? `common_${(field as CommonField).common_field_id}`
      : `specific_${(field as PrizeSpecificField).prize_specific_field_id}`
    
    const fieldValue = fieldValues[fieldId]
    const file = fileUploads[fieldId]
    const value = fieldValue?.value || ''

    switch (field.field_type) {
      case 'label':
        return (
          <div key={fieldId} className="md:col-span-2 pt-4">
            <h3 className="border-b pb-2 text-lg font-semibold text-foreground">
              {field.field_name}
            </h3>
          </div>
        )

      case 'text':
        return (
          <div key={fieldId} className="space-y-2">
            <Label>
              {field.field_name} {field.is_required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
              required={field.is_required === true || field.is_required === 1}
            />
          </div>
        )
      
      case 'textarea':
        return (
          <div key={fieldId} className="space-y-2">
            <Label>
              {field.field_name} {field.is_required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
              required={field.is_required === true || field.is_required === 1}
              className="min-h-[100px]"
            />
          </div>
        )
      
      case 'number':
        return (
          <div key={fieldId} className="space-y-2">
            <Label>
              {field.field_name} {field.is_required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
              required={field.is_required === true || field.is_required === 1}
            />
          </div>
        )
      
      case 'date':
        return (
          <div key={fieldId} className="space-y-2">
            <Label>
              {field.field_name} {field.is_required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
              required={field.is_required === true || field.is_required === 1}
            />
          </div>
        )
      
      case 'file':
        return (
          <div key={fieldId} className="space-y-2">
            <Label>
              {field.field_name} {field.is_required && <span className="text-red-500">*</span>}
            </Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                id={fieldId}
                className="hidden"
                onClick={(e) => {
                  e.currentTarget.value = ""
                }}
                onChange={(e) => handleFileChange(fieldId, e.target.files?.[0] || null, e.currentTarget)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label htmlFor={fieldId} className="cursor-pointer">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG (Max {MAX_FILE_SIZE_LABEL} per file)</p>
                  </>
                )}
              </label>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  if (loadingFields) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading application form...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stepper with Guidelines Link */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center gap-4 flex-1">
            {[1, 2, 3].slice(0, totalSteps).map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${step >= i ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                >
                  {step > i ? <CheckCircle2 className="h-5 w-5" /> : i}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {i === commonFieldsStep && "Common Information"}
                  {i === prizeSpecificStep && "Prize Specific"}
                  {i === reviewStep && "Review"}
                </span>
              </div>
            ))}
          </div>
          <Link
            href={`/prizes/${prizeId}/apply/guidelines`}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Guidelines</span>
          </Link>
        </div>
      </div>

      {/* File Size Limit Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
          File Upload Limit
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="mt-1 space-y-1">
            <p>
              <strong>Each uploaded file must be {MAX_FILE_SIZE_LABEL} or less.</strong>
            </p>
            <p className="text-sm mt-1">
              Files larger than {MAX_FILE_SIZE_LABEL} cannot be submitted.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === commonFieldsStep && "Common Information (Required for All Prizes)"}
            {step === prizeSpecificStep && "Prize Specific Information"}
            {step === reviewStep && "Review & Submit"}
          </CardTitle>
          {step === commonFieldsStep && (
            <p className="text-sm text-muted-foreground mt-2">
              Please fill in all common fields. These fields are required for all prize applications.
            </p>
          )}
          {step === prizeSpecificStep && prizeSpecificStep && (
            <p className="text-sm text-muted-foreground mt-2">
              Please fill in the prize-specific fields for this award.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4 min-h-[300px]">
          {step === commonFieldsStep && (
            <>
              {commonFields.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No common fields available.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {commonFields.map(field => renderField(field, true))}
                </div>
              )}
            </>
          )}

          {step === prizeSpecificStep && prizeSpecificStep && (
            <>
              {prizeSpecificFields.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No prize-specific fields for this award. Click Next to review your application.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {prizeSpecificFields.map(field => renderField(field, false))}
                </div>
              )}
            </>
          )}

          {step === reviewStep && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Application Summary</h3>
                  {Object.keys(fileUploads).length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      File limit: {MAX_FILE_SIZE_LABEL} each
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Common Information:</h4>
                  {commonFields.filter(isInputField).map(field => {
                    const key = `common_${field.common_field_id}`
                    const value = fieldValues[key]
                    return (
                      <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{field.field_name}:</span>
                        <span>
                          {field.field_type === 'file' 
                            ? (fileUploads[key]?.name || "Not uploaded")
                            : (value?.value || "-")}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {prizeSpecificFields.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h4 className="font-medium text-sm">Prize Specific Information:</h4>
                    {prizeSpecificFields.filter(isInputField).map(field => {
                      const key = `specific_${field.prize_specific_field_id}`
                      const value = fieldValues[key]
                      return (
                        <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">{field.field_name}:</span>
                          <span>
                            {field.field_type === 'file' 
                              ? (fileUploads[key]?.name || "Not uploaded")
                              : (value?.value || "-")}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="terms" 
                  checked={isDeclarationChecked}
                  onCheckedChange={(checked) => {
                    setIsDeclarationChecked(checked === true)
                  }}
                />
                <Label 
                  htmlFor="terms" 
                  className="text-sm cursor-pointer"
                  onClick={() => {
                    setIsDeclarationChecked(!isDeclarationChecked)
                  }}
                >
                  I declare that all information provided is accurate and true.
                </Label>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="flex gap-2 ml-auto">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t("action.back")}
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                {t("action.next")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={(e) => {
                  handleSubmit(e)
                }} 
                disabled={isLoading || !isDeclarationChecked}
                type="button"
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("action.submitting")}
                  </>
                ) : (
                  t("action.submit")
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Success Dialog */}
      <Dialog 
        open={showSuccessDialog} 
        onOpenChange={(open) => {
          if (!open) {
            // Clear auto-redirect timeout if dialog is closed manually
            if (redirectTimeoutRef.current) {
              clearTimeout(redirectTimeoutRef.current)
              redirectTimeoutRef.current = null
            }
            // Redirect to dashboard when dialog closes
            router.push("/dashboard")
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Successfully Submitted
            </DialogTitle>
            <DialogDescription>
              Your application has been submitted successfully. You will be redirected to your dashboard in a few seconds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => {
                // Clear auto-redirect timeout if user clicks button
                if (redirectTimeoutRef.current) {
                  clearTimeout(redirectTimeoutRef.current)
                  redirectTimeoutRef.current = null
                }
                setShowSuccessDialog(false)
                router.push("/dashboard")
              }}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
