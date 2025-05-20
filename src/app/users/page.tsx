
"use client";

import * as React from "react";
import Link from "next/link";
import {
  fetchUsers,
  deleteUser,
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
  UsersRound as UsersIcon, // Changed from UserCircle
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const USER_TYPES = ["B2C", "B2B"]; // Hardcoded as per instruction
const ALL_USERS_FILTER_VALUE = "__ALL_USER_TYPES__";

export default function UsersListPage() {
  const { toast } = useToast();
  const [usersPage, setUsersPage] = React.useState<Page<UserDto> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const loadUsers = React.useCallback(async (page: number, size: number, search: string, type: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { page: number; size: number; search?: string; type?: string } = { page, size };
      if (search) params.search = search;
      if (type) params.type = type;
      const data = await fetchUsers(params);
      setUsersPage(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users.");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch users.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadUsers(currentPage, pageSize, searchTerm, filterType);
  }, [loadUsers, currentPage, pageSize, searchTerm, filterType]);

  const handleSearchDebounced = React.useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(0); // Reset to first page on new search
    }, 500),
    []
  );

  const handleFilterChange = (selectedValue: string) => {
    setFilterType(selectedValue === ALL_USERS_FILTER_VALUE ? "" : selectedValue);
    setCurrentPage(0); // Reset to first page on filter change
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId);
      toast({ title: "Success", description: "User deleted successfully." });
      // Reload current page
      loadUsers(currentPage, pageSize, searchTerm, filterType);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete user.",
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


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <UsersIcon className="mr-3 h-7 w-7" /> User Management
          </h1>
          <p className="text-muted-foreground">
            View, add, edit, and manage all users.
          </p>
        </div>
        <Link href="/users/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Users</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or phone..."
                  className="pl-8 w-full sm:w-[200px] md:w-[250px]"
                  onChange={(e) => handleSearchDebounced(e.target.value)}
                />
              </div>
              <Select value={filterType || ALL_USERS_FILTER_VALUE} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_USERS_FILTER_VALUE}>All Types</SelectItem>
                  {USER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            A list of all registered users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center py-4">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] hidden sm:table-cell">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-user-${index}`}>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : usersPage && usersPage.content.length > 0 ? (
                usersPage.content.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium hidden sm:table-cell">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{user.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell">{user.email || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={user.type === "B2B" ? "secondary" : "default"}>
                        {user.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <Badge variant={user.status?.toLowerCase() === 'active' ? 'default' : 'outline'} 
                               className={user.status?.toLowerCase() === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'}>
                            {user.status || "N/A"}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="View User">
                        <Link href={`/users/${user.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="Edit User">
                        <Link href={`/users/${user.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" title="Delete User">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the user "{user.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id)}
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
                  <TableCell colSpan={7} className="text-center py-10">
                    <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No users found.</p>
                    {searchTerm && <p className="text-sm text-muted-foreground">Try adjusting your search term or filter.</p>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {usersPage && usersPage.totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={usersPage.first || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {usersPage.number + 1} of {usersPage.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={usersPage.last || isLoading}
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
