
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchStaffById, deleteStaffMember, type StaffDto, type UserDto } from "@/lib/apiClient";
import { ChevronLeft, Edit, Trash2, Briefcase, UserCircle, CalendarDays, AlertCircle, ShieldCheck, ListTree, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { format } from 'date-fns';

function DetailItem({ label, value, icon: Icon }: { label: string; value?: string | null | number; icon?: React.ElementType }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start space-x-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-1" />}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{String(value)}</p>
      </div>
    </div>
  );
}

function UserDetailCard({ user }: { user?: UserDto | null }) {
  if (!user) return <p className="text-sm text-muted-foreground">User details not available.</p>;
  return (
    <Card className="bg-secondary/30">
      <CardHeader><CardTitle className="text-base">Linked User Account</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <DetailItem label="User ID" value={user.id} />
        <DetailItem label="Name" value={user.name} />
        <DetailItem label="Phone" value={user.phone} />
        <DetailItem label="Email" value={user.email} />
        <DetailItem label="User Type" value={user.type} />
        {user.type === "B2B" && <DetailItem label="User GSTIN" value={user.gstin} />}
      </CardContent>
    </Card>
  )
}


export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = Number(params.id);
  const { toast } = useToast();

  const [staffMember, setStaffMember] = React.useState<StaffDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isNaN(staffId)) {
      toast({ title: "Error", description: "Invalid staff ID.", variant: "destructive" });
      router.push("/staff");
      return;
    }

    async function loadStaff() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedStaff = await fetchStaffById(staffId);
        setStaffMember(fetchedStaff);
      } catch (err: any) {
        console.error("Error fetching staff details:", err);
        setError(err.message || "Could not load staff data.");
        toast({
          title: "Error Fetching Staff",
          description: err.message || "Could not load staff data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadStaff();
  }, [staffId, router, toast]);

  const handleDeleteStaff = async () => {
    if (!staffMember) return;
    try {
      await deleteStaffMember(staffMember.id);
      toast({ title: "Success", description: `Staff member ${staffMember.user?.name || 'ID: '+staffMember.id} deleted successfully.` });
      router.push("/staff");
      router.refresh();
    } catch (err: any) {
      console.error("Error deleting staff member:", err);
      toast({
        title: "Error Deleting Staff",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-9 w-9" />
            <div><Skeleton className="h-8 w-48 mb-1" /><Skeleton className="h-4 w-64" /></div>
          </div>
          <div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /></div>
        </div>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Staff Member</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/staff")}>Back to Staff List</Button>
      </div>
    );
  }

  if (!staffMember) {
    return <p className="text-center text-muted-foreground py-10">Staff member not found.</p>;
  }
  
  const staffStatus = staffMember.status ? (staffMember.status).toUpperCase() : "N/A";
  const staffUserName = staffMember.user?.name || `User ID: ${staffMember.userId}`;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Back to Staff List">
            <Link href="/staff"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
              <Briefcase className="mr-2 h-6 w-6 sm:h-7 sm:w-7" /> Staff Details: {staffUserName}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">Viewing information for staff ID: {staffMember.id}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-initial">
            <Link href={`/staff/${staffMember.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit Staff</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1 sm:flex-initial">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Staff
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the staff member: {staffUserName}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <UserDetailCard user={staffMember.user} />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Staff Role & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center"><ListTree className="h-4 w-4 mr-1.5"/>Roles</p>
            {staffMember.roles && staffMember.roles.length > 0 ? (
              staffMember.roles.map(role => (
                <Badge key={role} variant="secondary" className="mr-1 mb-1">
                  {role.replace(/_/g, ' ').charAt(0).toUpperCase() + role.replace(/_/g, ' ').slice(1).toLowerCase()}
                </Badge>
              ))
            ) : <p className="text-sm">N/A</p>}
          </div>
           <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center"><ShieldCheck className="h-4 w-4 mr-1.5"/>Permissions</p>
            {staffMember.permissions && staffMember.permissions.length > 0 ? (
                <p className="text-sm truncate max-w-md">{staffMember.permissions.join(', ')}</p>
            ) : <p className="text-sm">N/A (Defaults to role-based permissions)</p>}
          </div>
           <div className="flex items-start space-x-2">
            <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={staffStatus === 'ACTIVE' ? 'default' : 'outline'}
                       className={staffStatus === 'ACTIVE' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-gray-500/20 text-gray-700 border-gray-500/30'}>
                    {staffStatus}
                </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Staff Profile Created At" value={staffMember.createdAt ? format(new Date(staffMember.createdAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
            <DetailItem label="Staff Profile Last Updated At" value={staffMember.updatedAt ? format(new Date(staffMember.updatedAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
        </CardContent>
      </Card>
    </div>
  );
}
