
"use client";

import * as React from "react";
import Link from "next/link";
import {
  fetchStaff,
  deleteStaffMember,
  type StaffDto,
  type UserDto,
  type Page,
} from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Search,
  Edit3,
  Trash2,
  Eye,
  Briefcase as StaffIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Hardcoded for now as meta APIs for roles/statuses are not used for form population
const STAFF_STATUSES = ["ACTIVE", "INACTIVE"]; 
const STAFF_ROLES = ["ADMIN", "MANAGER", "POS_USER", "SALES_PERSON"]; // Example roles

const ALL_STATUSES_FILTER = "__ALL_STAFF_STATUSES__";
const ALL_ROLES_FILTER = "__ALL_STAFF_ROLES__";

export default function StaffListPage() {
  const { toast } = useToast();
  const [staffPage, setStaffPage] = React.useState<Page<StaffDto> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("");
  const [filterRole, setFilterRole] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const loadStaff = React.useCallback(async (page: number, size: number, search: string, status: string, role: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { page: number; size: number; search?: string; status?: string; role?: string } = { page, size };
      if (search) params.search = search; // Assuming API supports search for staff
      if (status) params.status = status;
      if (role) params.role = role;
      
      const data = await fetchStaff(params);
      setStaffPage(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch staff members.");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch staff members.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadStaff(currentPage, pageSize, searchTerm, filterStatus, filterRole);
  }, [loadStaff, currentPage, pageSize, searchTerm, filterStatus, filterRole]);

  const handleSearchDebounced = React.useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(0); 
    }, 500),
    []
  );

  const handleFilterStatusChange = (selectedValue: string) => {
    setFilterStatus(selectedValue === ALL_STATUSES_FILTER ? "" : selectedValue);
    setCurrentPage(0);
  };

  const handleFilterRoleChange = (selectedValue: string) => {
    setFilterRole(selectedValue === ALL_ROLES_FILTER ? "" : selectedValue);
    setCurrentPage(0);
  };

  const handleDeleteStaff = async (staffId: number, staffName?: string) => {
    try {
      await deleteStaffMember(staffId);
      toast({ title: "Success", description: `Staff member ${staffName || 'ID: '+staffId} deleted successfully.` });
      loadStaff(currentPage, pageSize, searchTerm, filterStatus, filterRole);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || `Failed to delete staff member ${staffName || 'ID: '+staffId}.`,
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  }

  const getStaffUserName = (user?: UserDto) => {
    return user?.name || `User ID: ${user?.id || 'N/A'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <StaffIcon className="mr-3 h-7 w-7" /> Staff Management
          </h1>
          <p className="text-muted-foreground">
            Manage all staff members, their roles, and permissions.
          </p>
        </div>
        <Link href="/staff/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Staff
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Staff Members</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name..."
                  className="pl-8 w-full sm:w-[200px] md:w-[200px]"
                  onChange={(e) => handleSearchDebounced(e.target.value)}
                />
              </div>
              <Select value={filterStatus || ALL_STATUSES_FILTER} onValueChange={handleFilterStatusChange}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES_FILTER}>All Statuses</SelectItem>
                  {STAFF_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRole || ALL_ROLES_FILTER} onValueChange={handleFilterRoleChange}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ROLES_FILTER}>All Roles</SelectItem>
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace(/_/g, ' ').charAt(0).toUpperCase() + role.replace(/_/g, ' ').slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center py-4">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / User ID</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="hidden md:table-cell">Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-staff-${index}`}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : staffPage && staffPage.content.length > 0 ? (
                staffPage.content.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{getStaffUserName(staff.user)}</TableCell>
                    <TableCell>
                      {staff.roles?.length > 0 
                        ? staff.roles.map(role => (
                            <Badge key={role} variant="secondary" className="mr-1 mb-1 text-xs">
                              {role.replace(/_/g, ' ')}
                            </Badge>
                          ))
                        : "N/A"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs truncate max-w-xs">
                        {staff.permissions && staff.permissions.length > 0 ? staff.permissions.join(', ') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={staff.status.toUpperCase() === "ACTIVE" ? "default" : "outline"}
                             className={staff.status.toUpperCase() === "ACTIVE" ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-gray-500/20 text-gray-700 border-gray-500/30"}>
                        {staff.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="View Staff Details">
                        <Link href={`/staff/${staff.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="Edit Staff">
                        <Link href={`/staff/${staff.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" title="Delete Staff Member">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the staff member: {getStaffUserName(staff.user)}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteStaff(staff.id, getStaffUserName(staff.user))}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <StaffIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No staff members found.</p>
                     {(searchTerm || filterStatus || filterRole) && <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {staffPage && staffPage.totalPages > 1 && (
             <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={staffPage.first || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {staffPage.number + 1} of {staffPage.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={staffPage.last || isLoading}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


    