"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemList, ItemListCard } from "@/components/ui/item-list";
import { 
  PlusCircle, 
  Search, 
  UploadCloud, 
  Filter, 
  Edit2, 
  Trash2, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Eye 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  fetchProcurements, 
  searchProcurements, 
  updateProcurementStatus,
  deleteProcurement,
  fetchProcurementDashboard,
  fetchBusinessProfileById,
  type ProcurementDto, 
  type Page,
  type ProcurementDashboardDto,
  type BusinessProfileDto
} from "@/lib/apiClient";
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
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ProcurementsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // State for procurements and pagination
  const [procurements, setProcurements] = useState<ProcurementDto[]>([]);
  const [businessProfiles, setBusinessProfiles] = useState<Record<string, BusinessProfileDto>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // State for action loading
  const [processingProcurementId, setProcessingProcurementId] = useState<string | null>(null);
  const [deletingProcurementId, setDeletingProcurementId] = useState<string | null>(null);
  const [procurementToDelete, setProcurementToDelete] = useState<ProcurementDto | null>(null);

  // State for filters
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [procurementStatuses, setProcurementStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<ProcurementDashboardDto | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // Search debounce timer
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  // Procurement statuses are now hardcoded as they don't need to be fetched from the API
  useEffect(() => {
    // Default statuses that can be used for filtering
    setProcurementStatuses(['PENDING', 'PAID', 'PARTIALLY_PAID']);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoadingDashboard(true);
      try {
        const data = await fetchProcurementDashboard();
        setDashboardData(data);
      } catch (error: any) {
        toast({
          title: "Error loading dashboard",
          description: error.message || "Failed to load procurement dashboard data.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    loadDashboardData();
  }, [toast]);

  // Fetch procurements based on current filters and pagination
  useEffect(() => {
    const loadProcurements = async () => {
      if (searchKeyword.trim()) {
        return; // Skip this effect when searchKeyword changes - the search effect will handle it
      }

      setIsLoading(true);
      try {
        // Use regular fetch with filters
        const result = await fetchProcurements({
          sortBy,
          sortDir,
          status: statusFilter === "all" ? undefined : statusFilter,
          page: currentPage,
          size: pageSize,
        });
        setProcurements(result.content);
        setTotalPages(result.totalPages);

        // Fetch business profiles for procurements that don't have one
        const profilePromises = result.content
          .filter(proc => !proc.businessProfile && proc.businessProfileId)
          .map(async proc => {
            try {
              const profile = await fetchBusinessProfileById(proc.businessProfileId);
              return { id: proc.businessProfileId, profile };
            } catch (error) {
              console.error(`Failed to fetch business profile ${proc.businessProfileId}:`, error);
              return null;
            }
          });

        const profiles = await Promise.all(profilePromises);
        const newBusinessProfiles = { ...businessProfiles };

        profiles.forEach(item => {
          if (item) {
            newBusinessProfiles[item.id] = item.profile;
          }
        });

        setBusinessProfiles(newBusinessProfiles);
      } catch (error: any) {
        toast({
          title: "Error loading procurements",
          description: error.message || "Failed to load procurements. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProcurements();
  }, [currentPage, pageSize, statusFilter, sortBy, sortDir, toast]);

  // Handle search with debounce
  useEffect(() => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    if (searchKeyword.trim()) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const result = await searchProcurements(searchKeyword, currentPage, pageSize, `${sortBy},${sortDir}`);
          setProcurements(result.content);
          setTotalPages(result.totalPages);

          // Fetch business profiles for procurements that don't have one
          const profilePromises = result.content
            .filter(proc => !proc.businessProfile && proc.businessProfileId)
            .map(async proc => {
              try {
                const profile = await fetchBusinessProfileById(proc.businessProfileId);
                return { id: proc.businessProfileId, profile };
              } catch (error) {
                console.error(`Failed to fetch business profile ${proc.businessProfileId}:`, error);
                return null;
              }
            });

          const profiles = await Promise.all(profilePromises);
          const newBusinessProfiles = { ...businessProfiles };

          profiles.forEach(item => {
            if (item) {
              newBusinessProfiles[item.id] = item.profile;
            }
          });

          setBusinessProfiles(newBusinessProfiles);
        } catch (error: any) {
          toast({
            title: "Search error",
            description: error.message || "Failed to search procurements. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsSearching(false);
        }
      }, 500);
      setSearchTimer(timer);
    }
  }, [searchKeyword, currentPage, pageSize, sortBy, sortDir, toast]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setCurrentPage(0); // Reset to first page on new search
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(0); // Reset to first page on filter change
  };

  // Handle pagination
  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle procurement deletion
  const handleDeleteProcurement = async (procurementId: string) => {
    setDeletingProcurementId(procurementId);
    try {
      await deleteProcurement(procurementId);
      setProcurements(procurements.filter(p => p.id !== procurementId));
      toast({
        title: "Procurement deleted",
        description: "The procurement has been successfully deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting procurement",
        description: error.message || "Failed to delete procurement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingProcurementId(null);
      setProcurementToDelete(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (error) {
      return dateString;
    }
  };

  // Calculate days until due date and determine status color
  const getDueDateStatus = (dueDate: string | undefined) => {
    if (!dueDate) return { color: "bg-gray-100 text-gray-700", status: "N/A" };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day

      const dueDateObj = new Date(dueDate);
      dueDateObj.setHours(0, 0, 0, 0); // Reset time to start of day

      const diffTime = dueDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Past due date
        return { 
          color: "bg-red-100 text-red-700", 
          status: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue` 
        };
      } else if (diffDays <= 5) {
        // Due soon (4-5 days)
        return { 
          color: "bg-yellow-100 text-yellow-700", 
          status: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}` 
        };
      } else {
        // Due in more than 5 days
        return { 
          color: "bg-green-100 text-green-700", 
          status: `Due in ${diffDays} days` 
        };
      }
    } catch (error) {
      return { color: "bg-gray-100 text-gray-700", status: "Invalid date" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Procurement Tracking</h1>
          <p className="text-muted-foreground">Manage vendor purchases, invoices, and payments.</p>
        </div>
        <Link href="/procurements/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> New Procurement
          </Button>
        </Link>
      </div>

      {/* Dashboard Cards */}
      {isLoadingDashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-24 animate-pulse">
              <CardContent className="p-6">
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">Current Month Total</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.currentMonthTotal)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.pendingAmount)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">Due Invoices</p>
                <p className="text-2xl font-bold">{dashboardData.dueCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">Due Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.dueAmount)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="shadow-md">
        <CardHeader>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Procurements</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search procurements..." 
                  className="pl-8 w-full md:w-[250px]" 
                  value={searchKeyword}
                  onChange={handleSearchChange}
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {procurementStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>Track your purchases, vendor details, and payment statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || isSearching ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : procurements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchKeyword ? "No procurements found matching your search." : "No procurements found."}
            </div>
          ) : (
            <>
              {/* Mobile-first ItemList view */}
              <div className="block md:hidden">
                <ItemList
                  items={procurements}
                  isLoading={isLoading || isSearching}
                  loadingState={
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }
                  emptyState={
                    <div className="text-center py-8 text-muted-foreground">
                      {searchKeyword ? "No procurements found matching your search." : "No procurements found."}
                    </div>
                  }
                  renderItem={(proc, index) => {
                    const vendorName = proc.businessProfile?.companyName || 
                                      businessProfiles[proc.businessProfileId]?.companyName || 
                                      "Unknown Vendor";

                    const statusBadge = (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        proc.paymentStatus === "PAID" ? "bg-green-100 text-green-700" :
                        proc.paymentStatus === "PENDING" ? "bg-orange-100 text-orange-700" :
                        proc.paymentStatus === "PARTIALLY_PAID" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700" // Default
                      }`}>
                        {proc.paymentStatus || proc.status || "Draft"}
                      </span>
                    );

                    let dueDateDisplay;
                    if (proc.dueDate) {
                      const dueStatus = getDueDateStatus(proc.dueDate);
                      dueDateDisplay = (
                        <span className={`px-2 py-1 text-xs rounded-full ${dueStatus.color}`}>
                          {formatDate(proc.dueDate)} - {dueStatus.status}
                        </span>
                      );
                    } else {
                      dueDateDisplay = (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          Not set
                        </span>
                      );
                    }

                    const actions = (
                      <div className="flex space-x-1">
                        <Link href={`/procurements/${proc.id}`}>
                          <Button variant="ghost" size="icon" className="hover:text-primary" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/procurements/${proc.id}/edit`}>
                          <Button variant="ghost" size="icon" className="hover:text-primary" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:text-destructive" 
                              title="Delete"
                              onClick={() => setProcurementToDelete(proc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[90vw] md:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Procurement</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this procurement? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="mt-2 sm:mt-0">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => proc.id && handleDeleteProcurement(proc.id)}
                                disabled={deletingProcurementId === proc.id}
                                className="mt-2 sm:mt-0"
                              >
                                {deletingProcurementId === proc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );

                    return (
                      <ItemListCard
                        key={proc.id}
                        title={`${proc.invoiceNumber}`}
                        subtitle={vendorName}
                        status={statusBadge}
                        amount={formatCurrency(proc.invoiceAmount)}
                        date={dueDateDisplay}
                        actions={actions}
                        onClick={() => router.push(`/procurements/${proc.id}`)}
                      />
                    );
                  }}
                />
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procurements.map((proc) => (
                      <TableRow key={proc.id}>
                        <TableCell className="font-medium">{proc.id?.substring(0, 8)}</TableCell>
                        <TableCell>
                          {proc.businessProfile?.companyName || businessProfiles[proc.businessProfileId]?.companyName || "Unknown Vendor"}
                        </TableCell>
                        <TableCell>{proc.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(proc.invoiceDate)}</TableCell>
                        <TableCell>{proc.items?.length || 0}</TableCell>
                        <TableCell>{formatCurrency(proc.invoiceAmount)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            proc.paymentStatus === "PAID" ? "bg-green-100 text-green-700" :
                            proc.paymentStatus === "PENDING" ? "bg-orange-100 text-orange-700" :
                            proc.paymentStatus === "PARTIALLY_PAID" ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-700" // Default
                          }`}>
                            {proc.paymentStatus || proc.status || "Draft"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {proc.dueDate ? (
                            (() => {
                              const dueStatus = getDueDateStatus(proc.dueDate);
                              return (
                                <span className={`px-2 py-1 text-xs rounded-full ${dueStatus.color}`}>
                                  {formatDate(proc.dueDate)} - {dueStatus.status}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                              Not set
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Link href={`/procurements/${proc.id}`}>
                              <Button variant="ghost" size="icon" className="hover:text-primary" title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/procurements/${proc.id}/edit`}>
                              <Button variant="ghost" size="icon" className="hover:text-primary" title="Edit">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="hover:text-destructive" 
                                  title="Delete"
                                  onClick={() => setProcurementToDelete(proc)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-[90vw] md:max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Procurement</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this procurement? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel className="mt-2 sm:mt-0">Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => proc.id && handleDeleteProcurement(proc.id)}
                                    disabled={deletingProcurementId === proc.id}
                                    className="mt-2 sm:mt-0"
                                  >
                                    {deletingProcurementId === proc.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{currentPage + 1}</span> of{" "}
                    <span className="font-medium">{totalPages}</span> pages
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Page</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Page</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
