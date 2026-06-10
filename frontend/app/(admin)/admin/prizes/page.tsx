"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { apiClient } from "@/lib/api-client"
import { prizesFromApiResponse } from "@/lib/prize-list-response"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Archive, Search, Loader2, ToggleLeft, ToggleRight, MoreHorizontal, FileText, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Prize {
  prize_id: number
  title: string
  description?: string
  open_date: string
  close_date: string
  is_active: boolean | number
}

interface PrizeSpecificField {
  prize_specific_field_id: number
  prize_id: number
  field_name: string
  field_type: 'text' | 'textarea' | 'number' | 'file' | 'date' | 'label'
  is_required: boolean | number
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'file', label: 'File' },
  { value: 'date', label: 'Date' },
  { value: 'label', label: 'Label' },
] as const

type FieldType = (typeof FIELD_TYPES)[number]['value']

export default function AdminPrizesPage() {
  const { token } = useAuth({ requireAuth: true, requireAdmin: true })
  const { t } = useTranslation()

  const [prizes, setPrizes] = useState<Prize[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(false)

  const [newPrize, setNewPrize] = useState({
    title: "",
    description: "",
    open_date: "",
    close_date: "",
    is_active: true,
  })

  const [editPrize, setEditPrize] = useState<Prize | null>(null)

  // Prize-specific field management
  const [isFieldsDialogOpen, setIsFieldsDialogOpen] = useState(false)
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null)
  const [prizeFields, setPrizeFields] = useState<PrizeSpecificField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [isCreateFieldOpen, setIsCreateFieldOpen] = useState(false)
  const [submittingField, setSubmittingField] = useState(false)
  const [newField, setNewField] = useState({
    field_name: "",
    field_type: "text" as FieldType,
    is_required: true,
  })
  const [editingField, setEditingField] = useState<PrizeSpecificField | null>(null)
  const [isEditFieldOpen, setIsEditFieldOpen] = useState(false)
  const [updatingField, setUpdatingField] = useState(false)

  const fetchPrizes = async () => {
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

      const response = await apiClient.get("/api/prize?limit=100&page=1", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      setPrizes(prizesFromApiResponse(response.data) as Prize[])
    } catch (err) {
      console.error("Prize fetch error:", err)
      toast.error("Failed to fetch awards")
      setPrizes([])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchPrizes()
  }, [])

  const filteredPrizes = prizes.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newPrize.title || !newPrize.open_date || !newPrize.close_date) {
      toast.error("Title, open date, and close date are required")
      return
    }

    setSubmitting(true)

    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      const response = await apiClient.post(
        "/api/prize",
        {
          title: newPrize.title,
          description: newPrize.description || null,
          open_date: newPrize.open_date,
          close_date: newPrize.close_date,
          is_active: newPrize.is_active,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      toast.success(response.data?.msg || "Award created!")

      setNewPrize({
        title: "",
        description: "",
        open_date: "",
        close_date: "",
        is_active: true,
      })

      setIsCreateOpen(false)
      fetchPrizes()
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to create award")
    }

    setSubmitting(false)
  }

  const handleToggleStatus = async (prize: Prize) => {
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      const currentActive = prize.is_active === false ? false : Boolean(prize.is_active)

      const response = await apiClient.patch(
        `/api/prize/${prize.prize_id}/status`,
        { is_active: !currentActive },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      toast.success(response.data?.msg || "Status updated")
      fetchPrizes()
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to update status")
    }
  }

  const handleArchive = async (prize: Prize) => {
    const confirmDelete = window.confirm(`Archive (delete) award "${prize.title}"? This cannot be undone.`)
    if (!confirmDelete) return

    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      await apiClient.delete(`/api/prize/${prize.prize_id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      toast.success("Award archived (deleted)")
      fetchPrizes()
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to archive award")
    }
  }

  const renderEditDialog = () => {
    if (!editPrize) return null

    return (
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Award</DialogTitle>
            <DialogDescription>Update the award details and save.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={editPrize.title} disabled />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={editPrize.description || ""}
                onChange={(e) => setEditPrize({ ...editPrize, description: e.target.value })}
                placeholder="Enter award description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Open Date *</Label>
                <Input
                  type="date"
                  value={editPrize.open_date || ""}
                  onChange={(e) => setEditPrize({ ...editPrize, open_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Close Date *</Label>
                <Input
                  type="date"
                  value={editPrize.close_date || ""}
                  onChange={(e) => setEditPrize({ ...editPrize, close_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={editPrize.is_active === false ? false : Boolean(editPrize.is_active)}
                disabled
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const handleOpenEdit = (prize: Prize) => {
    setEditPrize({
      ...prize,
      is_active: prize.is_active === false ? false : Boolean(prize.is_active),
      open_date: prize.open_date ? prize.open_date.slice(0, 10) : "",
      close_date: prize.close_date ? prize.close_date.slice(0, 10) : "",
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editPrize?.open_date || !editPrize.close_date) {
      toast.error("Open date and close date are required")
      return
    }

    setUpdating(true)
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        setUpdating(false)
        return
      }

      const prizeId = editPrize.prize_id ?? (editPrize as any).id
      const response = await apiClient.put(
        `/api/prize/${prizeId}`,
        {
          title: editPrize.title,
          description: editPrize.description || null,
          open_date: editPrize.open_date,
          close_date: editPrize.close_date,
          is_active: editPrize.is_active === false ? false : Boolean(editPrize.is_active),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      toast.success(response.data?.msg || "Award updated")
      setIsEditOpen(false)
      setEditPrize(null)
      fetchPrizes()
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to update award")
    } finally {
      setUpdating(false)
    }
  }

  // Prize-specific field functions
  const handleOpenFieldsDialog = async (prize: Prize) => {
    setSelectedPrize(prize)
    setIsFieldsDialogOpen(true)
    await fetchPrizeFields(prize.prize_id)
  }

  const fetchPrizeFields = async (prizeId: number) => {
    setLoadingFields(true)
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      const response = await apiClient.get(`/api/admin/prize-specific-fields/prize/${prizeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      setPrizeFields(Array.isArray(response.data) ? response.data : [])
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to fetch prize fields")
      setPrizeFields([])
    } finally {
      setLoadingFields(false)
    }
  }

  const handleCreateField = async () => {
    if (!newField.field_name || !newField.field_type || !selectedPrize) {
      toast.error("Field name and field type are required")
      return
    }

    setSubmittingField(true)
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      const response = await apiClient.post(
        "/api/admin/prize-specific-fields",
        {
          prize_id: selectedPrize.prize_id,
          field_name: newField.field_name,
          field_type: newField.field_type,
          is_required: newField.field_type === 'label' ? false : newField.is_required,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      toast.success(response.data?.msg || "Award field created!")
      setNewField({
        field_name: "",
        field_type: "text",
        is_required: true,
      })
      setIsCreateFieldOpen(false)
      if (selectedPrize) {
        await fetchPrizeFields(selectedPrize.prize_id)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.msg || "Failed to create award field")
    } finally {
      setSubmittingField(false)
    }
  }

  const handleOpenEditField = (field: PrizeSpecificField) => {
    setEditingField({
      ...field,
      is_required: field.is_required === false ? false : Boolean(field.is_required),
    })
    setIsEditFieldOpen(true)
  }

  const handleUpdateField = async () => {
    if (!editingField?.field_name || !editingField.field_type) {
      toast.error("Field name and field type are required")
      return
    }

    setUpdatingField(true)
    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        setUpdatingField(false)
        return
      }

      const fieldId = editingField.prize_specific_field_id
      const response = await apiClient.put(
        `/api/admin/prize-specific-fields/${fieldId}`,
        {
          field_name: editingField.field_name,
          field_type: editingField.field_type,
          is_required: editingField.field_type === 'label' ? false : editingField.is_required === false ? false : Boolean(editingField.is_required),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      toast.success(response.data?.msg || "Award field updated")
      setIsEditFieldOpen(false)
      setEditingField(null)
      if (selectedPrize) {
        await fetchPrizeFields(selectedPrize.prize_id)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.msg || "Failed to update award field")
    } finally {
      setUpdatingField(false)
    }
  }

  const handleDeleteField = async (field: PrizeSpecificField) => {
    const confirmDelete = window.confirm(
      `Delete award field "${field.field_name}"? This cannot be undone.`
    )
    if (!confirmDelete) return

    try {
      const adminToken =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
          : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      await apiClient.delete(`/api/admin/prize-specific-fields/${field.prize_specific_field_id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      toast.success("Award field deleted")
      if (selectedPrize) {
        await fetchPrizeFields(selectedPrize.prize_id)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.msg || "Failed to delete award field")
    }
  }

  return (
    <div className="space-y-8 p-8">
      {renderEditDialog()}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.prize.title")}</h1>
          <p className="text-muted-foreground">{t("admin.prize.subtitle")}</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {t("admin.prize.create")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.prize.create")}</DialogTitle>
              <DialogDescription>Fill the form to add a new award.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input
                  value={newPrize.title}
                  onChange={(e) => setNewPrize({ ...newPrize, title: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={newPrize.description}
                  onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Open Date *</Label>
                  <Input
                    type="date"
                    value={newPrize.open_date}
                    onChange={(e) => setNewPrize({ ...newPrize, open_date: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Close Date *</Label>
                  <Input
                    type="date"
                    value={newPrize.close_date}
                    onChange={(e) => setNewPrize({ ...newPrize, close_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newPrize.is_active}
                  onCheckedChange={(checked) =>
                    setNewPrize({ ...newPrize, is_active: checked as boolean })
                  }
                />
                <Label>Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("admin.prize.all_prizes")}</CardTitle>

            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.prize.search")}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredPrizes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No awards found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Open Date</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredPrizes.map((p) => (
                  <TableRow key={p.prize_id}>
                    <TableCell>{p.prize_id}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {p.description || "-"}
                    </TableCell>
                    <TableCell>{new Date(p.open_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(p.close_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.is_active
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {p.is_active ? t("admin.prize.active") : t("admin.prize.inactive")}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(p)}
                        >
                          {p.is_active ? (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-1" /> Set Inactive
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-4 w-4 mr-1" /> Set Active
                            </>
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <button
                                className="flex w-full items-center"
                                onClick={() => handleOpenEdit(p)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </button>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <button
                                className="flex w-full items-center"
                                onClick={() => handleOpenFieldsDialog(p)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Manage Fields
                              </button>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <button
                                className="flex w-full items-center text-red-600"
                                onClick={() => handleArchive(p)}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </button>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Prize Fields Management Dialog */}
      <Dialog open={isFieldsDialogOpen} onOpenChange={setIsFieldsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Fields for: {selectedPrize?.title}
            </DialogTitle>
            <DialogDescription>
              Add, edit, or remove award-specific fields for this award.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isCreateFieldOpen} onOpenChange={setIsCreateFieldOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Field
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Award-Specific Field</DialogTitle>
                    <DialogDescription>
                      Add a new field specific to this award.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Field Name *</Label>
                      <Input
                        value={newField.field_name}
                        onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                        placeholder="e.g., Research Proposal, Portfolio"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Field Type *</Label>
                      <Select
                        value={newField.field_type}
                        onValueChange={(value: any) =>
                          setNewField({ ...newField, field_type: value, is_required: value === 'label' ? false : newField.is_required })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        disabled={newField.field_type === 'label'}
                        checked={newField.is_required}
                        onCheckedChange={(checked) =>
                          setNewField({ ...newField, is_required: checked as boolean })
                        }
                      />
                      <Label>Required</Label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateFieldOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateField} disabled={submittingField}>
                      {submittingField && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingFields ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : prizeFields.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No award-specific fields. Add one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Field Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prizeFields.map((f) => (
                    <TableRow key={f.prize_specific_field_id}>
                      <TableCell className="font-medium">{f.field_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{f.field_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            f.is_required
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          }
                        >
                          {f.is_required ? "Required" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditField(f)}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteField(f)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={isEditFieldOpen} onOpenChange={setIsEditFieldOpen}>
        {editingField && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Award-Specific Field</DialogTitle>
              <DialogDescription>Update the field details and save.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Field Name *</Label>
                <Input
                  value={editingField.field_name}
                  onChange={(e) =>
                    setEditingField({ ...editingField, field_name: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Field Type *</Label>
                <Select
                  value={editingField.field_type}
                  onValueChange={(value: any) =>
                    setEditingField({ ...editingField, field_type: value, is_required: value === 'label' ? false : editingField.is_required })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  disabled={editingField.field_type === 'label'}
                  checked={
                    editingField.is_required === false
                      ? false
                      : Boolean(editingField.is_required)
                  }
                  onCheckedChange={(checked) =>
                    setEditingField({ ...editingField, is_required: checked as boolean })
                  }
                />
                <Label>Required</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditFieldOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateField} disabled={updatingField}>
                {updatingField ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
