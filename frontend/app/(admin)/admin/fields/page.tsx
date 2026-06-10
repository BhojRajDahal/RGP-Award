"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n-context"

interface CommonField {
  common_field_id: number
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

export default function CommonFieldsPage() {
  const { token } = useAuth({ requireAuth: true, requireAdmin: true })
  const { t } = useTranslation()

  const [fields, setFields] = useState<CommonField[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(false)

  const [newField, setNewField] = useState({
    field_name: "",
    field_type: "text" as FieldType,
    is_required: true,
  })

  const [editField, setEditField] = useState<CommonField | null>(null)

  const fetchFields = async () => {
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

      const response = await apiClient.get("/api/admin/common-fields", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      setFields(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error("Fields fetch error:", err)
      toast.error("Failed to fetch common fields")
      setFields([])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchFields()
  }, [])

  const filteredFields = fields.filter((f) =>
    f.field_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newField.field_name || !newField.field_type) {
      toast.error("Field name and field type are required")
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
        "/api/admin/common-fields",
        {
          field_name: newField.field_name,
          field_type: newField.field_type,
          is_required: newField.field_type === 'label' ? false : newField.is_required,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      toast.success(response.data?.msg || "Common field created!")
      setNewField({
        field_name: "",
        field_type: "text",
        is_required: true,
      })
      setIsCreateOpen(false)
      fetchFields()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.msg || "Failed to create common field")
    }

    setSubmitting(false)
  }

  const handleOpenEdit = (field: CommonField) => {
    setEditField({
      ...field,
      is_required: field.is_required === false ? false : Boolean(field.is_required),
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editField?.field_name || !editField.field_type) {
      toast.error("Field name and field type are required")
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

      const fieldId = editField.common_field_id
      const response = await apiClient.put(
        `/api/admin/common-fields/${fieldId}`,
        {
          field_name: editField.field_name,
          field_type: editField.field_type,
          is_required: editField.field_type === 'label' ? false : editField.is_required === false ? false : Boolean(editField.is_required),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )

      toast.success(response.data?.msg || "Common field updated")
      setIsEditOpen(false)
      setEditField(null)
      fetchFields()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.msg || "Failed to update common field")
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (field: CommonField) => {
    const confirmDelete = window.confirm(
      `Delete common field "${field.field_name}"? This cannot be undone.`
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

      await apiClient.delete(`/api/admin/common-fields/${field.common_field_id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      toast.success("Common field deleted")
      fetchFields()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.msg || "Failed to delete common field")
    }
  }

  return (
    <div className="space-y-8 p-8">
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        {editField && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Common Field</DialogTitle>
              <DialogDescription>Update the common field details and save.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Field Name *</Label>
                <Input
                  value={editField.field_name}
                  onChange={(e) => setEditField({ ...editField, field_name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Field Type *</Label>
                <Select
                  value={editField.field_type}
                  onValueChange={(value: any) =>
                    setEditField({ ...editField, field_type: value, is_required: value === 'label' ? false : editField.is_required })
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
                  disabled={editField.field_type === 'label'}
                  checked={editField.is_required === false ? false : Boolean(editField.is_required)}
                  onCheckedChange={(checked) =>
                    setEditField({ ...editField, is_required: checked as boolean })
                  }
                />
                <Label>Required</Label>
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
        )}
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Common Fields</h1>
          <p className="text-muted-foreground">
            Manage common fields that apply to all prize applications
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Common Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Common Field</DialogTitle>
              <DialogDescription>
                Add a new common field that will be available for all prize applications.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Field Name *</Label>
                <Input
                  value={newField.field_name}
                  onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                  placeholder="e.g., Full Name, Email, Phone"
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
            <CardTitle>All Common Fields</CardTitle>

            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fields..."
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
          ) : filteredFields.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No common fields found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Field Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredFields.map((f) => (
                  <TableRow key={f.common_field_id}>
                    <TableCell>{f.common_field_id}</TableCell>
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
                          onClick={() => handleOpenEdit(f)}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(f)}
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
        </CardContent>
      </Card>
    </div>
  )
}

