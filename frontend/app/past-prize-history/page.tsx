"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { itemsFromPagedApiResponse } from "@/lib/paged-api-response"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { Navbar } from "@/components/ui/navbar"

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

export default function PastPrizeHistoryPage() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchGalleryItems(currentPage)
  }, [currentPage])

  const fetchGalleryItems = async (page = currentPage) => {
    setLoading(true)
    try {
      const response = await apiClient.get(`/api/gallery/public?limit=${GALLERY_ITEMS_PER_PAGE}&page=${page}`)
      const pagination = response.data?.pagination

      setGalleryItems(itemsFromPagedApiResponse<GalleryItem>(response.data))
      setTotalPages(Math.max(1, Number(pagination?.totalPages) || 1))
    } catch (err: any) {
      // Only log errors in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error("Gallery fetch error:", err)
      }
      // Gracefully handle error - set empty array so UI shows "No gallery items available"
      setGalleryItems([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
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

  const shouldShowViewMore = (description?: string | null) => {
    return Boolean(description && description.length > 140)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Past Prize History</h1>
          <p className="text-muted-foreground">Gallery of past prize winners and award recipients</p>
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
              <p className="text-muted-foreground">No gallery items available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map((item) => (
                <Card key={item.gallery_id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                      <div className="mb-2">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {item.description}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">Year: {item.year}</p>
                    {shouldShowViewMore(item.description) && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 py-1 text-sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          View more
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
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

        <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedItem.name}</DialogTitle>
                  <DialogDescription>
                    {selectedItem.award} • Year: {selectedItem.year}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                    {selectedItem.photo ? (
                      <Image
                        src={getFileUrl(selectedItem.photo)}
                        alt={selectedItem.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Award: {selectedItem.award}</p>
                    <p className="text-sm text-muted-foreground">Year: {selectedItem.year}</p>
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {selectedItem.description || "No description available."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
