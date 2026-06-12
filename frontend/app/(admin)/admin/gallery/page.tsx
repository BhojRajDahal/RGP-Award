"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { prizesFromApiResponse } from "@/lib/prize-list-response"
import { itemsFromPagedApiResponse } from "@/lib/paged-api-response"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, Trash2, Pencil, Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import Image from "next/image"

interface GalleryItem {
  gallery_id: number
  name: string
  award: string
  description?: string | null
  photo: string
  year: number
  created_at: string
}

const GALLERY_ITEMS_PER_PAGE = 9

export default function GalleryPage() {
  const { token } = useAuth({ requireAuth: true, requireAdmin: true })

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [awards, setAwards] = useState<Array<{ prize_id: number; title: string }>>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    award: "",
    description: "",
    year: "",
    photo: "",
  })

  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null)

  useEffect(() => {
    fetchAwards()
  }, [])

  useEffect(() => {
    fetchGalleryItems(currentPage)
  }, [currentPage])

  const fetchGalleryItems = async (page = currentPage) => {
    setLoading(true)
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("No authentication token found")
        setLoading(false)
        return
      }

      const response = await apiClient.get(`/api/admin/gallery?limit=${GALLERY_ITEMS_PER_PAGE}&page=${page}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      const pagination = response.data?.pagination
      setGalleryItems(itemsFromPagedApiResponse<GalleryItem>(response.data))
      setTotalPages(Math.max(1, Number(pagination?.totalPages) || 1))
    } catch (err: any) {
      console.error("Gallery fetch error:", err)
      toast.error(err.response?.data?.msg || "Failed to fetch gallery items")
      setGalleryItems([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const fetchAwards = async () => {
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        return
      }

      const response = await apiClient.get("/api/prize?limit=100&page=1", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      const prizes = prizesFromApiResponse(response.data)
      const awardsList = prizes.map((prize: any) => ({ prize_id: prize.prize_id, title: prize.title }))
      setAwards(awardsList)
      console.log("Fetched awards:", awardsList)
    } catch (err: any) {
      console.error("Awards fetch error:", err)
      toast.error("Failed to fetch awards")
    }
  }

  const handleAddPhoto = () => {
    setIsEditMode(false)
    setFormData({ name: "", award: "", description: "", year: "", photo: "" })
    setSelectedFile(null)
    setPreviewUrl(null)
    setEditingItem(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (item: GalleryItem) => {
    setIsEditMode(true)
    setEditingItem(item)
    setFormData({
      name: item.name,
      award: item.award,
      description: item.description || "",
      year: item.year.toString(),
      photo: item.photo,
    })
    setSelectedFile(null)
    setPreviewUrl(item.photo ? getFileUrl(item.photo) : null)
    setIsDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.award || !formData.year) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!isEditMode && !selectedFile) {
      toast.error("Please select a photo")
      return
    }

    setSubmitting(true)
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("No authentication token found")
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append("name", formData.name)
      formDataToSend.append("award", formData.award)
      formDataToSend.append("description", formData.description)
      formDataToSend.append("year", formData.year)

      if (selectedFile) {
        formDataToSend.append("photo", selectedFile)
      }

      if (isEditMode && editingItem) {
        await apiClient.put(`/api/admin/gallery/${editingItem.gallery_id}`, formDataToSend, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        })
        toast.success("Gallery item updated successfully")
      } else {
        await apiClient.post("/api/admin/gallery", formDataToSend, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        })
        toast.success("Gallery item added successfully")
      }

      setIsDialogOpen(false)
      if (isEditMode) {
        fetchGalleryItems(currentPage)
      } else {
        setCurrentPage(1)
        fetchGalleryItems(1)
      }
      resetForm()
    } catch (err: any) {
      console.error("Submit error:", err)
      toast.error(err.response?.data?.msg || "Failed to save gallery item")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (gallery_id: number) => {
    if (!confirm("Are you sure you want to delete this gallery item?")) {
      return
    }

    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("No authentication token found")
        return
      }

      await apiClient.delete(`/api/admin/gallery/${gallery_id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      toast.success("Gallery item deleted successfully")
      if (galleryItems.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1)
      } else {
        fetchGalleryItems(currentPage)
      }
    } catch (err: any) {
      console.error("Delete error:", err)
      toast.error(err.response?.data?.msg || "Failed to delete gallery item")
    }
  }

  const resetForm = () => {
    setFormData({ name: "", award: "", description: "", year: "", photo: "" })
    setSelectedFile(null)
    setPreviewUrl(null)
    setEditingItem(null)
    setIsEditMode(false)
  }

  const getFileUrl = (filePath: string) => {
    if (!filePath) return ""
    const cleanPath = filePath.replace(/^public\//, "")
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL
    if (rawBase && rawBase.includes("http")) {
      return `${rawBase}/api/files/${cleanPath}`
    }
    return `/api/files/${cleanPath}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Gallery</h1>
          <p className="text-muted-foreground">Add and manage gallery photos with award information</p>
        </div>
        <Button onClick={handleAddPhoto}>
          <Plus className="mr-2 h-4 w-4" />
          Add photos
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading gallery items...</span>
        </div>
      ) : galleryItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No gallery items yet. Click "Add photos" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {galleryItems.map((item) => (
              <Card key={item.gallery_id} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  {item.photo ? (
                    <Image
                      src={getFileUrl(item.photo)}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">Award: {item.award}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{item.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-4">Year: {item.year}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="flex-1"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.gallery_id)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "outline" : "ghost"}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="ghost"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Gallery Item" : "Add Gallery Item"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the gallery item information" : "Add a new photo to the gallery"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="award">Award</Label>
              {awards.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                  No awards available. Create a prize first.
                </p>
              ) : (
                <Select
                  value={
                    (() => {
                      const match = awards.find((a) => a.title === formData.award)
                      return match ? String(match.prize_id) : ""
                    })()
                  }
                  onValueChange={(pid) => {
                    const picked = awards.find((a) => String(a.prize_id) === pid)
                    setFormData({
                      ...formData,
                      award: picked?.title?.trim()
                        ? picked.title
                        : picked
                          ? `Prize #${picked.prize_id}`
                          : "",
                    })
                  }}
                >
                  <SelectTrigger id="award" className="w-full">
                    <SelectValue placeholder="Select award" />
                  </SelectTrigger>
                  <SelectContent>
                    {awards.map((award) => (
                      <SelectItem
                        key={award.prize_id}
                        value={String(award.prize_id)}
                      >
                        {award.title?.trim()
                          ? award.title
                          : `Prize #${award.prize_id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {previewUrl && (
                <div className="mt-2 relative w-full aspect-video bg-muted rounded-md overflow-hidden border">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2076 (Nepali year)"
                min="2000"
                max="3000"
              />
              <p className="text-xs text-muted-foreground">Enter year (Nepali calendar, e.g., 2076)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Adding..."}
                </>
              ) : (
                isEditMode ? "Update" : "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

