
"use client";

import * as React from "react";
import Link from "next/link";
import {
  fetchBusinessProfiles,
  deleteBusinessProfile,
  type BusinessProfileDto,
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
  Building2 as BusinessProfilesIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PROFILE_STATUSES = ["ACTIVE", "INACTIVE"]; // Hardcoded
const ALL_PROFILES_FILTER_VALUE = "__ALL_PROFILE_STATUSES__";

export default function BusinessProfilesListPage() {
  const { toast } = useToast();
  const [profilesPage, setProfilesPage] = React.useState<Page<BusinessProfileDto> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const loadProfiles = React.useCallback(async (page: number, size: number, search: string, status: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { page: number; size: number; search?: string; status?: string } = { page, size };
      if (search) params.search = search;
      if (status) params.status = status;
      const data = await fetchBusinessProfiles(params);
      setProfilesPage(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch business profiles.");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch business profiles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadProfiles(currentPage, pageSize, searchTerm, filterStatus);
  }, [loadProfiles, currentPage, pageSize, searchTerm, filterStatus]);

  const handleSearchDebounced = React.useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(0);
    }, 500),
    []
  );

  const handleFilterChange = (selectedValue: string) => {
    setFilterStatus(selectedValue === ALL_PROFILES_FILTER_VALUE ? "" : selectedValue);
    setCurrentPage(0);
  };

  const handleDeleteProfile = async (profileId: number) => {
    try {
      await deleteBusinessProfile(profileId);
      toast({ title: "Success", description: "Business profile deleted successfully." });
      loadProfiles(currentPage, pageSize, searchTerm, filterStatus);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete business profile.",
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
            <BusinessProfilesIcon className="mr-3 h-7 w-7" /> Business Profile Management
          </h1>
          <p className="text-muted-foreground">
            Manage all company profiles.
          </p>
        </div>
        <Link href="/business-profiles/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Profile
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Business Profiles</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by company name..."
                  className="pl-8 w-full sm:w-[200px] md:w-[250px]"
                  onChange={(e) => handleSearchDebounced(e.target.value)}
                />
              </div>
              <Select value={filterStatus || ALL_PROFILES_FILTER_VALUE} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROFILES_FILTER_VALUE}>All Statuses</SelectItem>
                  {PROFILE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
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
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">GSTIN</TableHead>
                <TableHead className="hidden lg:table-cell">Payment Terms</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-profile-${index}`}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                      <Skeleton className="h-8 w-8 inline-block rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : profilesPage && profilesPage.content.length > 0 ? (
                profilesPage.content.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{profile.gstin}</TableCell>
                    <TableCell className="hidden lg:table-cell">{profile.paymentTerms || "N/A"}</TableCell>
                    <TableCell>{profile.userIds?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={profile.status.toUpperCase() === "ACTIVE" ? "default" : "outline"}
                             className={profile.status.toUpperCase() === "ACTIVE" ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-gray-500/20 text-gray-700 border-gray-500/30"}>
                        {profile.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="View Profile">
                        <Link href={`/business-profiles/${profile.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="Edit Profile">
                        <Link href={`/business-profiles/${profile.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" title="Delete Profile">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the profile "{profile.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProfile(profile.id)}
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
                  <TableCell colSpan={6} className="text-center py-10">
                    <BusinessProfilesIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No business profiles found.</p>
                     {searchTerm && <p className="text-sm text-muted-foreground">Try adjusting your search term or filter.</p>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {profilesPage && profilesPage.totalPages > 1 && (
             <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={profilesPage.first || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {profilesPage.number + 1} of {profilesPage.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={profilesPage.last || isLoading}
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

