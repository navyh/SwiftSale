"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  fetchProcurementStatuses,
  updateProcurementStatus,
  deleteProcurement,
  type ProcurementDto, 
  type Page 
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

  // Search debounce timer
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch procurement statuses for filter dropdown
  useEffect(() => {
    const loadProcurementStatuses = async () => {
      try {
        const statuses = await fetchProcurementStatuses();
        setProcurementStatuses(statuses);
      } catch (error) {
        console.error("Failed to load procurement statuses:", error);
      }
    };
    loadProcurementStatuses();
  }, []);

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procurements.map((proc) => (
                    <TableRow key={proc.id}>
                      <TableCell className="font-medium">{proc.id?.substring(0, 8)}</TableCell>
                      <TableCell>{proc.businessProfile?.name || "Unknown Vendor"}</TableCell>
                      <TableCell>{proc.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(proc.invoiceDate)}</TableCell>
                      <TableCell>{proc.items?.length || 0}</TableCell>
                      <TableCell>{formatCurrency(proc.invoiceAmount)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          proc.status === "PAID" ? "bg-green-100 text-green-700" :
                          proc.status === "PENDING" ? "bg-orange-100 text-orange-700" :
                          proc.status === "PARTIALLY_PAID" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700" // Default
                        }`}>
                          {proc.status || "Draft"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
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
                        {!proc.invoiceImage && (
                          <Button variant="ghost" size="icon" className="hover:text-primary" title="Upload Invoice">
                            <UploadCloud className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="hover:text-accent" title="Track Payment">
                          <DollarSign className="h-4 w-4" />
                        </Button>
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
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Procurement</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this procurement? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => proc.id && handleDeleteProcurement(proc.id)}
                                disabled={deletingProcurementId === proc.id}
                              >
                                {deletingProcurementId === proc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
