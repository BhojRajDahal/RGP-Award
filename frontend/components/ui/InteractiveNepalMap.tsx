"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, FileCheck, Trophy, MapPin, Loader2 } from "lucide-react"
import NepalMap from "@/components/ui/NepalMap"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

// Component to render just the SVG part of NepalMap
function NepalMapSVG() {
  return (
    <div className="w-full h-full overflow-hidden">
      <div className="w-full h-full" style={{ maxWidth: "100%", maxHeight: "100%" }}>
        <NepalMap />
      </div>
    </div>
  )
}

interface Application {
  application_id: number
  user_id: number
  prize_id: number
  status: string
  submitted_at?: string
  created_at?: string
  user?: {
    full_name?: string
    email?: string
  }
  prize?: {
    prize_name?: string
  }
  prize_title?: string
  common_field_values?: Array<{
    field_name?: string
    value?: string
    field_type?: string
  }>
  specific_field_values?: Array<{
    field_name?: string
    value?: string
    field_type?: string
  }>
  prize_specific_field_values?: Array<{
    field_name?: string
    value?: string
    field_type?: string
  }>
}

interface AwardOptionSource {
  prize_id?: number
  id?: string
  title?: string
  prize_name?: string
}

interface ProvinceData {
  name: string
  value: number
  applications: number
  applicationsMale: number
  applicationsFemale: number
  users: number
  prizes: number
}

interface MapStats {
  totalUsers: number
  totalApplications: number
  totalPrizes: number
}


// Province options
const PROVINCES = [
  { value: "all", label: "All Provinces" },
  { value: "Koshi", label: "Koshi (Province No. 1)" },
  { value: "Madhesh", label: "Madhesh (Province No. 2)" },
  { value: "Bagmati", label: "Bagmati (Province No. 3)" },
  { value: "Gandaki", label: "Gandaki (Province No. 4)" },
  { value: "Lumbini", label: "Lumbini (Province No. 5)" },
  { value: "Karnali", label: "Karnali (Province No. 6)" },
  { value: "Sudurpaschim", label: "Sudurpaschim (Province No. 7)" },
]

// Province coordinates on the map (viewBox: 0 0 2560 1440)
// Positioned to match the actual geographic locations of provinces in Nepal
// Map layout: Gandaki (center-left pink), Bagmati (center-right dark red), Koshi (far right light blue)
// Coordinates adjusted to ensure each province appears in its correct geographic region
const PROVINCE_COORDINATES: Record<string, { cx: number; cy: number }> = {
  sudurpaschim: { cx: 550, cy: 510 }, // Far-west, top-left (moved right and down)
  karnali: { cx: 850, cy: 600 }, // Top-left, mid-west (moved right and down)
  lumbini: { cx: 929, cy: 820 }, // Far left, south-west (moved right and down)
  gandaki: { cx: 1250, cy: 710 }, // Center-left (moved right and down)
  bagmati: { cx: 1600, cy: 900 }, // Center-right (moved right and down)
  madhesh: { cx: 1550, cy: 1160 }, // Below Bagmati, south-central (moved right and down)
  koshi: { cx: 2100, cy: 1150 }, // Far right, easternmost (moved right and down)
}

// Geographic order of provinces (west to east, top to bottom based on map coordinates)
// This ensures consistent ordering when displaying provinces
const GEOGRAPHIC_PROVINCE_ORDER = [
  "sudurpaschim", // West, top
  "karnali",      // Mid-west, top
  "lumbini",      // West, south
  "gandaki",      // Center-left
  "bagmati",      // Center-right
  "madhesh",      // Center, south
  "koshi",        // East
]

// Sex options
const SEX_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
]

interface InteractiveNepalMapProps {
  stats?: MapStats
  awards?: AwardOptionSource[]
  onDistrictSelect?: (district: string) => void
}

export default function InteractiveNepalMap({ 
  stats,
  awards = [],
  onDistrictSelect 
}: InteractiveNepalMapProps) {
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [sexFilter, setSexFilter] = useState<string>("all")
  const [provinceFilter, setProvinceFilter] = useState<string>("all")
  const [awardFilter, setAwardFilter] = useState<string>("all")

  // Helper function to extract field value by field name
  const getFieldValue = (app: Application, fieldName: string): string | null => {
    const fieldNameLower = fieldName.toLowerCase()
    
    // Check common fields
    if (app.common_field_values) {
      for (const field of app.common_field_values) {
        if (field.field_name && field.field_name.toLowerCase() === fieldNameLower) {
          return field.value || null
        }
      }
    }
    
    // Check specific fields
    const specificFields = app.specific_field_values || app.prize_specific_field_values || []
    if (specificFields.length > 0) {
      for (const field of specificFields) {
        if (field.field_name && field.field_name.toLowerCase() === fieldNameLower) {
          return field.value || null
        }
      }
    }
    
    return null
  }

  const getAwardName = (app: Application): string => {
    return app.prize?.prize_name || app.prize_title || `Award ${app.prize_id}`
  }

  const getAwardFilterValue = (app: Application): string => {
    return app.prize_id ? String(app.prize_id) : getAwardName(app)
  }

  // Helper function to extract sex from application
  const getSex = (app: Application): string | null => {
    // Try different field name variations
    const sexValue = getFieldValue(app, "sex") || 
                     getFieldValue(app, "gender") || 
                     getFieldValue(app, "sex/gender")
    
    if (!sexValue) return null
    
    // Normalize sex value
    const sexLower = sexValue.toLowerCase().trim()
    if (sexLower === "male" || sexLower === "m") return "Male"
    if (sexLower === "female" || sexLower === "f") return "Female"
    return sexValue
  }

  // Helper function to extract province from application
  const getProvince = (app: Application): string | null => {
    // Try different field name variations (check all possible variations)
    const provinceValue = getFieldValue(app, "province") || 
                          getFieldValue(app, "province name") || 
                          getFieldValue(app, "province_name") ||
                          getFieldValue(app, "Province") ||
                          getFieldValue(app, "Province Name") ||
                          getFieldValue(app, "PROVINCE") ||
                          getFieldValue(app, "provinceName") ||
                          getFieldValue(app, "ProvinceName")
    
    // Debug logging to help identify province matching issues
    if (provinceValue && process.env.NODE_ENV === 'development') {
      console.log('Province value found:', provinceValue, 'for application:', app.application_id)
    }
    
    if (!provinceValue) {
      // Log when province is not found to help debug
      if (process.env.NODE_ENV === 'development') {
        const allFieldNames = [
          ...(app.common_field_values || []).map(f => f.field_name),
          ...(app.specific_field_values || []).map(f => f.field_name)
        ].filter(Boolean)
        console.log('No province value found for application:', app.application_id, 'Available fields:', allFieldNames)
      }
      return null
    }
    
    // Normalize province value - handle variations (case-insensitive)
    const provinceLower = provinceValue.toLowerCase().trim()
    
    // Map common variations to standard names (case-insensitive matching)
    const provinceMap: Record<string, string> = {
      // Koshi variations
      "koshi": "Koshi",
      "province no. 1": "Koshi",
      "province no 1": "Koshi",
      "province 1": "Koshi",
      "province no.1": "Koshi",
      "province no1": "Koshi",
      // Madhesh variations
      "madhesh": "Madhesh",
      "province no. 2": "Madhesh",
      "province no 2": "Madhesh",
      "province 2": "Madhesh",
      "province no.2": "Madhesh",
      "province no2": "Madhesh",
      // Bagmati variations
      "bagmati": "Bagmati",
      "province no. 3": "Bagmati",
      "province no 3": "Bagmati",
      "province 3": "Bagmati",
      "province no.3": "Bagmati",
      "province no3": "Bagmati",
      // Gandaki variations
      "gandaki": "Gandaki",
      "province no. 4": "Gandaki",
      "province no 4": "Gandaki",
      "province 4": "Gandaki",
      "province no.4": "Gandaki",
      "province no4": "Gandaki",
      // Lumbini variations
      "lumbini": "Lumbini",
      "province no. 5": "Lumbini",
      "province no 5": "Lumbini",
      "province 5": "Lumbini",
      "province no.5": "Lumbini",
      "province no5": "Lumbini",
      // Karnali variations
      "karnali": "Karnali",
      "province no. 6": "Karnali",
      "province no 6": "Karnali",
      "province 6": "Karnali",
      "province no.6": "Karnali",
      "province no6": "Karnali",
      // Sudurpaschim variations
      "sudurpaschim": "Sudurpaschim",
      "sudurpashchim": "Sudurpaschim", // Common spelling variation with 'h'
      "sudurpashim": "Sudurpaschim", // Another variation
      "province no. 7": "Sudurpaschim",
      "province no 7": "Sudurpaschim",
      "province 7": "Sudurpaschim",
      "province no.7": "Sudurpaschim",
      "province no7": "Sudurpaschim",
    }
    
    // Check exact match first
    if (provinceMap[provinceLower]) {
      return provinceMap[provinceLower]
    }
    
    // Try partial matching for province names
    for (const [key, value] of Object.entries(provinceMap)) {
      if (provinceLower.includes(key) || key.includes(provinceLower)) {
        return value
      }
    }
    
    // If no match found, try to match by checking if the value contains province name
    const provinceNames = ["koshi", "madhesh", "bagmati", "gandaki", "lumbini", "karnali", "sudurpaschim", "sudurpashchim", "sudurpashim"]
    for (const name of provinceNames) {
      if (provinceLower.includes(name)) {
        // Normalize Sudurpaschim variations
        if (name.includes("sudurpas") || name.includes("sudurpash")) {
          return "Sudurpaschim"
        }
        return name.charAt(0).toUpperCase() + name.slice(1)
      }
    }
    
    // Try reverse lookup - check if the original value (case-insensitive) matches any standard province name
    const standardProvinces = ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpaschim"]
    for (const standardProvince of standardProvinces) {
      if (provinceLower === standardProvince.toLowerCase()) {
        return standardProvince
      }
    }
    
    // If still no match, return null (unknown province)
    return null
  }

  // Fetch applications on mount
  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true)
      try {
        const adminToken = typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

        if (!adminToken) {
          console.warn("No admin token found, skipping application fetch")
          setLoading(false)
          return
        }

        const response = await apiClient.get("/api/application", {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        })

        const raw = response.data
        const list = Array.isArray(raw)
          ? raw
          : raw && Array.isArray(raw.items)
            ? raw.items
            : []
        setApplications(list)
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
    const options = new Map<string, string>()
    for (const award of awards) {
      const value = award.prize_id ? String(award.prize_id) : award.id || award.title || award.prize_name
      const label = award.title || award.prize_name || (value ? `Award ${value}` : "")
      if (value && label && !options.has(value)) {
        options.set(value, label)
      }
    }
    for (const app of applications) {
      const value = getAwardFilterValue(app)
      const label = getAwardName(app)
      if (value && label && !options.has(value)) {
        options.set(value, label)
      }
    }
    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
  }, [applications, awards])

  // Filter applications based on sex, province, and award
  const filteredApplications = useMemo(() => {
    const list = Array.isArray(applications) ? applications : []
    return list.filter((app) => {
      // Filter by award
      if (awardFilter !== "all" && getAwardFilterValue(app) !== awardFilter) {
        return false
      }

      // Filter by sex
      if (sexFilter !== "all") {
        const appSex = getSex(app)
        if (!appSex || appSex !== sexFilter) return false
      }

      // Filter by province
      // getProvince() already normalizes the province value (e.g., "bagmati" -> "Bagmati", "Province No. 3" -> "Bagmati")
      // So we can do a direct case-insensitive comparison
      if (provinceFilter !== "all") {
        const appProvince = getProvince(app)
        if (!appProvince) return false
        
        // Case-insensitive comparison since getProvince returns normalized values
        if (appProvince.toLowerCase().trim() !== provinceFilter.toLowerCase().trim()) {
          return false
        }
      }

      return true
    })
  }, [applications, sexFilter, provinceFilter, awardFilter])

  // Calculate province statistics from filtered applications
  const provincesInfo = useMemo(() => {
    const provinceMap: Record<string, ProvinceData> = {}
    const provinceUserSets: Record<string, Set<number>> = {}
    const provincePrizeSets: Record<string, Set<number>> = {}

    filteredApplications.forEach((app) => {
      const province = getProvince(app)
      
      // Skip if no province found
      if (!province) return

      // Use normalized province name as key (lowercase)
      const provinceKey = province.toLowerCase()

      // Initialize province if not exists
      if (!provinceMap[provinceKey]) {
        provinceMap[provinceKey] = {
          name: province,
          value: 0,
          applications: 0,
          applicationsMale: 0,
          applicationsFemale: 0,
          users: 0,
          prizes: 0,
        }
        provinceUserSets[provinceKey] = new Set<number>()
        provincePrizeSets[provinceKey] = new Set<number>()
      }

      const provinceData = provinceMap[provinceKey]
      
      provinceData.applications++
      
      // Count by sex
      const sex = getSex(app)
      if (sex === "Male") {
        provinceData.applicationsMale++
      } else if (sex === "Female") {
        provinceData.applicationsFemale++
      }

      // Count unique users per province
      if (app.user_id && !provinceUserSets[provinceKey].has(app.user_id)) {
        provinceUserSets[provinceKey].add(app.user_id)
        provinceData.users++
      }

      // Count unique prizes per province
      if (app.prize_id && !provincePrizeSets[provinceKey].has(app.prize_id)) {
        provincePrizeSets[provinceKey].add(app.prize_id)
        provinceData.prizes++
      }
    })

    // Calculate value (normalized application count for visualization)
    const maxApplications = Math.max(...Object.values(provinceMap).map(p => p.applications), 1)
    Object.values(provinceMap).forEach((province) => {
      province.value = Math.round((province.applications / maxApplications) * 20)
    })

    return provinceMap
  }, [filteredApplications])

  // Calculate total stats from provinces
  const mapStats = useMemo(() => {
    const hasActiveFilters = sexFilter !== "all" || provinceFilter !== "all" || awardFilter !== "all"
    if (stats && !hasActiveFilters) return stats

    const totals = Object.values(provincesInfo).reduce(
      (acc, province) => ({
        totalUsers: acc.totalUsers + province.users,
        totalApplications: acc.totalApplications + province.applications,
        totalPrizes: acc.totalPrizes + province.prizes,
      }),
      { totalUsers: 0, totalApplications: 0, totalPrizes: 0 }
    )
    return totals
  }, [stats, provincesInfo, sexFilter, provinceFilter, awardFilter])

  const handleProvinceClick = (provinceKey: string) => {
    setSelectedProvince(provinceKey === selectedProvince ? null : provinceKey)
    if (onDistrictSelect) {
      onDistrictSelect(provinceKey)
    }
  }

  const selectedData = selectedProvince ? provincesInfo[selectedProvince] : null
  const hoveredData = hoveredProvince ? provincesInfo[hoveredProvince] : null
  const displayData = selectedData || hoveredData

  // Get color intensity based on value
  const getProvinceColor = (provinceKey: string) => {
    const province = provincesInfo[provinceKey]
    if (!province) return "#E5E7EB"
    
    const maxValue = Math.max(...Object.values(provincesInfo).map(p => p.value), 1)
    const intensity = province.value / maxValue
    
    if (selectedProvince === provinceKey) {
      return "#3B82F6" // Blue for selected
    }
    if (hoveredProvince === provinceKey) {
      return "#60A5FA" // Lighter blue for hovered
    }
    
    // Gradient from light to dark based on value
    const red = Math.floor(59 + (intensity * 196))
    const green = Math.floor(130 + (intensity * 125))
    const blue = Math.floor(246 - (intensity * 166))
    return `rgb(${red}, ${green}, ${blue})`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading map data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      <Card className="w-full overflow-x-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 break-words">
            <MapPin className="h-5 w-5 flex-shrink-0" />
            <span className="break-words">Nepal Map - Regional Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="w-full overflow-x-hidden">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Sex</label>
              <Select value={sexFilter} onValueChange={setSexFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  {SEX_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Award</label>
              <Select value={awardFilter} onValueChange={setAwardFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select award" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Awards</SelectItem>
                  {awardOptions.map((award) => (
                    <SelectItem key={award.value} value={award.value}>
                      {award.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Province</label>
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((province) => (
                    <SelectItem key={province.value} value={province.value}>
                      {province.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{mapStats.totalUsers}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold">{mapStats.totalApplications}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Awards</p>
                <p className="text-2xl font-bold">{mapStats.totalPrizes}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Map Container */}
            <div className="lg:col-span-3 relative w-full overflow-hidden">
              <div className="border rounded-lg overflow-hidden bg-gray-50 relative w-full">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  {/* Base Nepal Map - Using the SVG from NepalMap.tsx */}
                  <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: "none" }}>
                    <NepalMapSVG />
                  </div>
                  
                  {/* Interactive Overlay Layer */}
                  <svg
                    version="1.1"
                    id="interactive-layer"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    x="0px"
                    y="0px"
                    viewBox="0 0 2560 1440"
                    preserveAspectRatio="xMidYMid meet"
                    enableBackground="new 0 0 2560 1440"
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: "all", maxWidth: "100%", maxHeight: "100%" }}
                    xmlSpace="preserve"
                  >
                    <g id="interactive-overlays">
                    
                    {/* Province indicators - dots on the map */}
                    {Object.entries(provincesInfo)
                      .sort(([keyA], [keyB]) => {
                        // Sort by geographic order
                        const indexA = GEOGRAPHIC_PROVINCE_ORDER.indexOf(keyA)
                        const indexB = GEOGRAPHIC_PROVINCE_ORDER.indexOf(keyB)
                        // If province not found in order array, put it at the end
                        if (indexA === -1 && indexB === -1) return 0
                        if (indexA === -1) return 1
                        if (indexB === -1) return -1
                        return indexA - indexB
                      })
                      .map(([provinceKey, provinceData]) => {
                        // provinceKey is already lowercase from the calculation
                        const coords = PROVINCE_COORDINATES[provinceKey]
                        if (!coords) {
                          console.warn(`No coordinates found for province: ${provinceKey}`)
                          return null
                        }
                      
                      const isSelected = selectedProvince === provinceKey
                      const isHovered = hoveredProvince === provinceKey
                      const color = getProvinceColor(provinceKey)
                      
                      // Use the actual province name from data, not hardcoded label
                      const provinceLabel = provinceData.name.toUpperCase()
                      
                      return (
                        <g key={provinceKey}>
                          {/* Province dot/circle */}
                          <circle
                            cx={coords.cx}
                            cy={coords.cy}
                            r={isSelected ? 60 : isHovered ? 55 : 50}
                            fill={color}
                            opacity="0.7"
                            stroke="#1E40AF"
                            strokeWidth={isSelected ? "4" : "2"}
                            className="transition-all duration-200 hover:opacity-0.9 cursor-pointer"
                            onClick={() => handleProvinceClick(provinceKey)}
                            onMouseEnter={() => setHoveredProvince(provinceKey)}
                            onMouseLeave={() => setHoveredProvince(null)}
                          />
                          {/* Province label - use actual province name from data */}
                          <text
                            x={coords.cx}
                            y={coords.cy - 5}
                            textAnchor="middle"
                            fill="white"
                            fontSize={isSelected ? "16" : "14"}
                            fontWeight="bold"
                            pointerEvents="none"
                            stroke="#1E40AF"
                            strokeWidth="0.5"
                          >
                            {provinceLabel}
                          </text>
                          {/* Application count indicator */}
                          <text
                            x={coords.cx}
                            y={coords.cy + (isSelected ? 25 : 20)}
                            textAnchor="middle"
                            fill="white"
                            fontSize="16"
                            fontWeight="bold"
                            pointerEvents="none"
                            stroke="#1E40AF"
                            strokeWidth="0.5"
                          >
                            {provinceData.applications}
                          </text>
                        </g>
                      )
                    })}
                    </g>
                  </svg>
                </div>
              </div>
              
              {displayData && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">{displayData.name} Province</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Users</p>
                      <p className="text-xl font-bold">{displayData.users}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Awards</p>
                      <p className="text-xl font-bold">{displayData.prizes}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Applications by Gender</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Male</p>
                        <p className="text-2xl font-bold text-blue-700">{displayData.applicationsMale}</p>
                      </div>
                      <div className="bg-pink-100 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Female</p>
                        <p className="text-2xl font-bold text-pink-700">{displayData.applicationsFemale}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Total Applications</p>
                      <p className="text-xl font-bold">{displayData.applications}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Province List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Provinces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {Object.entries(provincesInfo)
                      .sort(([keyA], [keyB]) => {
                        // Sort by geographic order
                        const indexA = GEOGRAPHIC_PROVINCE_ORDER.indexOf(keyA)
                        const indexB = GEOGRAPHIC_PROVINCE_ORDER.indexOf(keyB)
                        // If province not found in order array, put it at the end
                        if (indexA === -1 && indexB === -1) return 0
                        if (indexA === -1) return 1
                        if (indexB === -1) return -1
                        return indexA - indexB
                      })
                      .map(([key, province]) => (
                        <div
                          key={key}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedProvince === key
                              ? "bg-blue-50 border-blue-500"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleProvinceClick(key)}
                          onMouseEnter={() => setHoveredProvince(key)}
                          onMouseLeave={() => setHoveredProvince(null)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{province.name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {province.users} users
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {province.applications} apps
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">
                                {province.value}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    {Object.keys(provincesInfo).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No provinces found with current filters
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
