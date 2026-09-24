"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  CheckCircle2, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Info, 
  BookOpen, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  GraduationCap, 
  Briefcase, 
  Hash, 
  FileText,
  Building,
  Sparkles,
  Award
} from "lucide-react"
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

const getFieldIcon = (fieldName: string, fieldType: FieldType) => {
  const name = fieldName.toLowerCase()
  if (fieldType === 'date' || name.includes('date') || name.includes('dob') || name.includes('birth') || name.includes('(ad)') || name.includes('(bs)')) {
    return <Calendar className="h-4 w-4" />
  }
  if (name.includes('mail')) {
    return <Mail className="h-4 w-4" />
  }
  if (name.includes('phone') || name.includes('mobile') || name.includes('contact')) {
    return <Phone className="h-4 w-4" />
  }
  if (name.includes('name') || name.includes('father') || name.includes('mother') || name.includes('applicant') || name.includes('sex') || name.includes('gender')) {
    return <User className="h-4 w-4" />
  }
  if (name.includes('address') || name.includes('district') || name.includes('city') || name.includes('province') || name.includes('location')) {
    return <MapPin className="h-4 w-4" />
  }
  if (name.includes('education') || name.includes('qualification') || name.includes('degree') || name.includes('subject') || name.includes('school') || name.includes('college') || name.includes('university')) {
    return <GraduationCap className="h-4 w-4" />
  }
  if (name.includes('work') || name.includes('experience') || name.includes('position') || name.includes('designation') || name.includes('occupation') || name.includes('contribution')) {
    return <Briefcase className="h-4 w-4" />
  }
  if (name.includes('office') || name.includes('institution') || name.includes('company') || name.includes('organization')) {
    return <Building className="h-4 w-4" />
  }
  if (fieldType === 'number' || name.includes('age') || name.includes('citizenship') || name.includes('number') || name.includes('no.')) {
    return <Hash className="h-4 w-4" />
  }
  if (fieldType === 'file') {
    return <Upload className="h-4 w-4" />
  }
  return <FileText className="h-4 w-4" />
}

export function ApplicationWizard({ prizeId, prize }: { prizeId: string; prize?: any }) {
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

  // Live completion calculations
  const requiredCommon = commonFields.filter(f => (f.is_required === true || f.is_required === 1) && f.field_type !== 'label')
  const filledCommon = requiredCommon.filter(f => {
    const k = `common_${f.common_field_id}`
    return f.field_type === 'file' ? !!fileUploads[k] : !!fieldValues[k]?.value?.trim()
  })
  
  const requiredSpecific = prizeSpecificFields.filter(f => (f.is_required === true || f.is_required === 1) && f.field_type !== 'label')
  const filledSpecific = requiredSpecific.filter(f => {
    const k = `specific_${f.prize_specific_field_id}`
    return f.field_type === 'file' ? !!fileUploads[k] : !!fieldValues[k]?.value?.trim()
  })

  const totalRequired = requiredCommon.length + requiredSpecific.length
  const totalFilled = filledCommon.length + filledSpecific.length
  const completionPercentage = totalRequired === 0 ? 100 : Math.min(100, Math.round((totalFilled / totalRequired) * 100))

  const isStep1Ready = requiredCommon.length === 0 || filledCommon.length === requiredCommon.length
  const step1Remaining = requiredCommon.length - filledCommon.length

  const isStep2Ready = requiredSpecific.length === 0 || filledSpecific.length === requiredSpecific.length
  const step2Remaining = requiredSpecific.length - filledSpecific.length

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
    const isRequired = field.is_required === true || field.is_required === 1
    const fieldIcon = getFieldIcon(field.field_name, field.field_type)

    switch (field.field_type) {
      case 'label':
        return (
          <div key={fieldId} className="md:col-span-2 pt-6 pb-2">
            <div className="flex items-center gap-2.5 border-b pb-2.5">
              <span className="w-1.5 h-4 bg-primary rounded-full inline-block"></span>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {field.field_name}
              </h3>
            </div>
          </div>
        )

      case 'text':
        return (
          <div key={fieldId} className="space-y-1.5 group">
            <Label className="text-sm font-semibold text-foreground/85 flex items-center gap-1.5">
              <span className="text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                {fieldIcon}
              </span>
              <span>{field.field_name}</span>
              {isRequired && <span className="text-rose-500 font-bold ml-0.5">*</span>}
            </Label>
            <div className="relative rounded-xl transition-all">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60 group-focus-within:text-primary transition-colors">
                {fieldIcon}
              </div>
              <Input
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
                required={isRequired}
                className="pl-10 h-11 rounded-xl bg-background border-border/80 hover:border-primary/40 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-sm shadow-2xs"
                placeholder={`Enter ${field.field_name.toLowerCase()}`}
              />
            </div>
          </div>
        )
      
      case 'textarea':
        return (
          <div key={fieldId} className="space-y-1.5 md:col-span-2 group">
            <Label className="text-sm font-semibold text-foreground/85 flex items-center gap-1.5">
              <span className="text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                {fieldIcon}
              </span>
              <span>{field.field_name}</span>
              {isRequired && <span className="text-rose-500 font-bold ml-0.5">*</span>}
            </Label>
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
              required={isRequired}
              className="min-h-[110px] resize-y rounded-xl p-3.5 bg-background border-border/80 hover:border-primary/40 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-sm shadow-2xs"
              placeholder={`Enter ${field.field_name.toLowerCase()}`}
            />
          </div>
        )
      
      case 'number':
        return (
          <div key={fieldId} className="space-y-1.5 group">
            <Label className="text-sm font-semibold text-foreground/85 flex items-center gap-1.5">
              <span className="text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                {fieldIcon}
              </span>
              <span>{field.field_name}</span>
              {isRequired && <span className="text-rose-500 font-bold ml-0.5">*</span>}
            </Label>
            <div className="relative rounded-xl transition-all">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60 group-focus-within:text-primary transition-colors">
                {fieldIcon}
              </div>
              <Input
                type="number"
                value={value}
                onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
                required={isRequired}
                className="pl-10 h-11 rounded-xl bg-background border-border/80 hover:border-primary/40 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-sm shadow-2xs"
                placeholder={`Enter ${field.field_name.toLowerCase()}`}
              />
            </div>
          </div>
        )
      
      case 'date':
        return (
          <div key={fieldId} className="space-y-1.5 group">
            <Label className="text-sm font-semibold text-foreground/85 flex items-center gap-1.5">
              <span className="text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                <Calendar className="h-4 w-4" />
              </span>
              <span>{field.field_name}</span>
              {isRequired && <span className="text-rose-500 font-bold ml-0.5">*</span>}
            </Label>
            <div className="relative rounded-xl transition-all">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60 group-focus-within:text-primary transition-colors">
                <Calendar className="h-4 w-4" />
              </div>
              <Input
                type="date"
                value={value}
                onChange={(e) => handleFieldChange(fieldId, e.target.value, isCommon)}
                required={isRequired}
                className="pl-10 h-11 rounded-xl bg-background border-border/80 hover:border-primary/40 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-sm shadow-2xs"
              />
            </div>
          </div>
        )
      
      case 'file':
        const isPhoto = field.field_name.toLowerCase().includes('photo') || field.field_name.toLowerCase().includes('picture') || field.field_name.toLowerCase().includes('image')
        return (
          <div key={fieldId} className="space-y-1.5 group">
            <Label className="text-sm font-semibold text-foreground/85 flex items-center gap-1.5">
              <span className="text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                <Upload className="h-4 w-4" />
              </span>
              <span>{field.field_name}</span>
              {isRequired && <span className="text-rose-500 font-bold ml-0.5">*</span>}
            </Label>
            <div className="relative">
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
              <label 
                htmlFor={fieldId} 
                className={`cursor-pointer flex items-center gap-3.5 px-4 py-3.5 min-h-[74px] rounded-xl border-2 transition-all duration-200 ${
                  file 
                    ? 'border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-600 shadow-2xs' 
                    : 'border-dashed border-border/90 hover:border-primary/60 bg-muted/10 hover:bg-muted/25 shadow-2xs'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  file ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary group-hover:bg-primary/15'
                }`}>
                  {file ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  {file ? (
                    <>
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400 mt-0.5 font-medium">
                        {(file.size / 1024).toFixed(1)} KB &bull; Selected
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {isPhoto ? "Upload Photo" : "Upload Document"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        PDF, DOC, DOCX, JPG, PNG (Max {MAX_FILE_SIZE_LABEL})
                      </p>
                    </>
                  )}
                </div>
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
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">Loading application form...</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form & Stepper (Col 8) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Stepper with Guidelines Link */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {[1, 2, 3].slice(0, totalSteps).map((i, idx) => {
              const isCompleted = step > i
              const isCurrent = step === i
              return (
                <div key={i} className="flex items-center gap-3 flex-1 sm:flex-initial">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all shadow-sm
                      ${isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/15 scale-105" : isCompleted ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : i}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                        Step {i}
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {i === commonFieldsStep && "Common Info"}
                        {i === prizeSpecificStep && "Award Specific"}
                        {i === reviewStep && "Review & Submit"}
                      </p>
                    </div>
                  </div>
                  {idx < totalSteps - 1 && (
                    <div className={`hidden sm:block h-[2px] w-8 md:w-12 rounded-full transition-colors ${step > i ? 'bg-emerald-600' : 'bg-border'}`} />
                  )}
                </div>
              )
            })}
          </div>

          <Link
            href={`/prizes/${prizeId}/apply/guidelines`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/20 transition-all ml-auto"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>View Guidelines</span>
          </Link>
        </div>

        {/* File Size Limit Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-blue-50/80 p-4 shadow-sm dark:border-blue-900/60 dark:from-blue-950/30 dark:to-indigo-950/20">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-blue-950 dark:text-blue-200">
                File Upload Guidelines
              </h4>
              <p className="text-xs text-blue-800/90 dark:text-blue-300">
                Each document or attachment must be under <strong className="font-semibold text-blue-950 dark:text-white">{MAX_FILE_SIZE_LABEL}</strong>. Supported formats: PDF, DOC, DOCX, JPG, PNG.
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/15 border-b p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                Step {step} of {totalSteps}
              </span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === commonFieldsStep && "Common Information"}
              {step === prizeSpecificStep && "Prize Specific Information"}
              {step === reviewStep && "Review & Submit"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {step === commonFieldsStep && "Please fill in your personal and general details for this application."}
              {step === prizeSpecificStep && "Please provide the specialized details and attachments for this award."}
              {step === reviewStep && "Please carefully review all entered details before final submission."}
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6 min-h-[300px]">
            {step === commonFieldsStep && (
              <>
                {commonFields.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No common fields available.</p>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
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
                  <div className="grid gap-5 md:grid-cols-2">
                    {prizeSpecificFields.map(field => renderField(field, false))}
                  </div>
                )}
              </>
            )}

            {step === reviewStep && (
              <div className="space-y-5">
                <div className="bg-muted/40 border rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-semibold text-base">Application Summary</h3>
                    {Object.keys(fileUploads).length > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {Object.keys(fileUploads).length} file(s) attached
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Common Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-background/60 p-4 rounded-lg border">
                      {commonFields.filter(isInputField).map(field => {
                        const key = `common_${field.common_field_id}`
                        const value = fieldValues[key]
                        return (
                          <div key={key} className="space-y-0.5 text-sm">
                            <p className="text-xs text-muted-foreground font-medium">{field.field_name}</p>
                            <p className="font-medium text-foreground">
                              {field.field_type === 'file' 
                                ? (fileUploads[key]?.name || "Not uploaded")
                                : (value?.value || "-")}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {prizeSpecificFields.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Prize Specific Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-background/60 p-4 rounded-lg border">
                        {prizeSpecificFields.filter(isInputField).map(field => {
                          const key = `specific_${field.prize_specific_field_id}`
                          const value = fieldValues[key]
                          return (
                            <div key={key} className="space-y-0.5 text-sm">
                              <p className="text-xs text-muted-foreground font-medium">{field.field_name}</p>
                              <p className="font-medium text-foreground">
                                {field.field_type === 'file' 
                                  ? (fileUploads[key]?.name || "Not uploaded")
                                  : (value?.value || "-")}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/20 border rounded-xl">
                  <Checkbox 
                    id="terms" 
                    checked={isDeclarationChecked}
                    onCheckedChange={(checked) => {
                      setIsDeclarationChecked(checked === true)
                    }}
                  />
                  <Label 
                    htmlFor="terms" 
                    className="text-sm font-medium cursor-pointer"
                  >
                    I declare that all information provided in this application is accurate and true.
                  </Label>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t bg-muted/10 p-5">
            <div className="flex gap-2.5 ml-auto">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="rounded-lg shadow-sm">
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t("action.back")}
                </Button>
              )}
              {step < totalSteps ? (
                <Button onClick={handleNext} className="rounded-lg shadow-sm">
                  {t("action.next")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={(e) => {
                    handleSubmit(e)
                  }} 
                  disabled={isLoading || !isDeclarationChecked}
                  type="button"
                  className="cursor-pointer rounded-lg shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>

      {/* Right Column: Live Tracker & Sidebar Information (Col 4) */}
      <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 self-start">
        {/* Live Form Completion Tracker */}
        <Card className="rounded-2xl border shadow-sm bg-card overflow-hidden">
          <CardHeader className="bg-muted/15 border-b p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Live Form Progress
              </CardTitle>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${completionPercentage === 100 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                {completionPercentage}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Animated Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fields Completed</span>
                <span className="font-semibold text-foreground">{totalFilled} of {totalRequired}</span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Readiness Status */}
            <div className="space-y-2 pt-2 border-t text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${step === 1 ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
                <div className="flex items-center gap-2">
                  {isStep1Ready ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                      1
                    </div>
                  )}
                  <span className="font-medium text-foreground">Common Information</span>
                </div>
                <span className={`text-[11px] font-semibold ${isStep1Ready ? 'text-emerald-600' : 'text-amber-600 dark:text-amber-400'}`}>
                  {isStep1Ready ? "Ready" : `${step1Remaining} fields remaining`}
                </span>
              </div>

              {prizeSpecificFields.length > 0 && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${step === 2 ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
                  <div className="flex items-center gap-2">
                    {isStep2Ready ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                        2
                      </div>
                    )}
                    <span className="font-medium text-foreground">Award Specifics</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isStep2Ready ? 'text-emerald-600' : 'text-amber-600 dark:text-amber-400'}`}>
                    {isStep2Ready ? "Ready" : `${step2Remaining} fields remaining`}
                  </span>
                </div>
              )}

              <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${step === reviewStep ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
                <div className="flex items-center gap-2">
                  {isDeclarationChecked ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                      ✓
                    </div>
                  )}
                  <span className="font-medium text-foreground">Declaration & Submit</span>
                </div>
                <span className={`text-[11px] font-semibold ${isDeclarationChecked ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {isDeclarationChecked ? "Confirmed" : "Pending"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Award Details Card */}
        {prize && (
          <Card className="rounded-2xl border shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/15 border-b p-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Award Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Nomination Title</span>
                <p className="font-semibold text-foreground text-sm mt-0.5">{prize.title}</p>
              </div>
              {prize.open_date && prize.close_date && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground">Opened</span>
                    <p className="font-medium mt-0.5">{new Date(prize.open_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deadline</span>
                    <p className="font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                      {new Date(prize.close_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Help & Support Card */}
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Need Help?</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Review the official{" "}
            <Link href={`/prizes/${prizeId}/apply/guidelines`} className="text-primary font-medium underline underline-offset-2">
              Award Guidelines
            </Link>{" "}
            for full details on document formats and submission rules.
          </p>
        </div>
      </div>

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
