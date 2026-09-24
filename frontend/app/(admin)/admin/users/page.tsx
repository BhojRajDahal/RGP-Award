"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MoreHorizontal, UserPlus, Trash2, Users, UserCog, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n-context"
import { apiClient } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"

interface User {
  id: number
  full_name: string
  email: string
  created_at?: string
}

interface Admin {
  aid: number
  full_name: string
  email: string
  department?: string | null
  created_at?: string
}

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ full_name: "", email: "", password: "", department: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const adminToken = typeof window !== "undefined"
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        toast.error("Authentication required")
        setIsLoadingUsers(false)
        return
      }

      const response = await apiClient.get("/api/admin/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      setUsers(Array.isArray(response.data) ? response.data : [])
    } catch (error: any) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
      setUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const fetchAdmins = async () => {
    setIsLoadingAdmins(true)
    try {
      const adminToken = typeof window !== "undefined"
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        toast.error("Authentication required")
        setIsLoadingAdmins(false)
        return
      }

      const response = await apiClient.get("/api/admin/admins", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      setAdmins(Array.isArray(response.data) ? response.data : [])
    } catch (error: any) {
      console.error("Error fetching admins:", error)
      toast.error("Failed to load admins")
      setAdmins([])
    } finally {
      setIsLoadingAdmins(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchAdmins()
  }, [])

  const topUsers = [...users]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime() || b.id - a.id)
    .slice(0, 10)

  const handleAddAdmin = async () => {
    if (!newAdmin.full_name || !newAdmin.email || !newAdmin.password) {
      toast.error("Please fill in all required fields (Name, Email, Password)")
      return
    }

    setIsSubmitting(true)
    try {
      const adminToken = typeof window !== "undefined"
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        toast.error("Authentication required")
        setIsSubmitting(false)
        return
      }

      const response = await apiClient.post("/api/admin/register", {
        full_name: newAdmin.full_name.trim(),
        email: newAdmin.email.trim(),
        password: newAdmin.password,
        department: newAdmin.department.trim() || null
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })

      toast.success(response.data?.msg || "Admin created successfully")
      setNewAdmin({ full_name: "", email: "", password: "", department: "" })
      setIsAddOpen(false)
      fetchAdmins()
    } catch (error: any) {
      console.error("Error creating admin:", error)
      const errorMsg = error.response?.data?.msg || error.message || "Failed to create admin"
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAdmin = async (aid: number) => {
    if (!confirm("Are you sure you want to remove this admin? They will lose access immediately. This action cannot be undone.")) {
      return
    }

    try {
      const adminToken = typeof window !== "undefined"
        ? localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
        : null

      if (!adminToken) {
        toast.error("Authentication required")
        return
      }

      await apiClient.delete(`/api/admin/admins/${aid}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })

      setAdmins(admins.filter((a) => a.aid !== aid))
      toast.success("Admin removed successfully")
    } catch (error: any) {
      console.error("Error deleting admin:", error)
      const errorMsg = error.response?.data?.msg || error.message || "Failed to delete admin"
      toast.error(errorMsg)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "N/A"
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground">{t("admin.users.subtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> {t("admin.users.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>Create a new administrator account. Password will be hashed securely.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newAdmin.full_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newAdmin.department}
                  onChange={(e) => setNewAdmin({ ...newAdmin, department: e.target.value })}
                  placeholder="Enter department (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false)
                setNewAdmin({ full_name: "", email: "", password: "", department: "" })
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddAdmin} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Admin"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users Column */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Regular Users
            </CardTitle>
            <Badge variant="secondary">
              {users.length > 10 ? `Top 10 of ${users.length}` : users.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.full_name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admins Column */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-purple-600" />
              Administrators
            </CardTitle>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {admins.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingAdmins ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading admins...</span>
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCog className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No admins found</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.aid}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-purple-100 text-purple-700">
                                {admin.full_name?.charAt(0)?.toUpperCase() || "A"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {admin.full_name}
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                  Admin
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">{admin.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {admin.department || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(admin.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAdmin(admin.aid)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remove Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
