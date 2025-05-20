
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchUserById, deleteUser, type UserDto, type AddressDto } from "@/lib/apiClient";
import { ChevronLeft, Edit, Trash2, UserCircle, MapPin, FileText, CalendarDays, AlertCircle } from "lucide-react";
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

function AddressCard({ address, isDefault }: { address: AddressDto; isDefault: boolean }) {
  return (
    <Card className="bg-secondary/30 p-4">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-base flex justify-between items-center">
          Address {address.id} {address.type ? `(${address.type})` : ''}
          {isDefault && <Badge variant="default">Default</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <p><span className="font-medium">Line 1:</span> {address.line1}</p>
        {address.line2 && <p><span className="font-medium">Line 2:</span> {address.line2}</p>}
        <p><span className="font-medium">City:</span> {address.city}</p>
        <p><span className="font-medium">State:</span> {address.state}</p>
        <p><span className="font-medium">Postal:</span> {address.postalCode}</p>
        <p><span className="font-medium">Country:</span> {address.country}</p>
      </CardContent>
    </Card>
  );
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);
  const { toast } = useToast();

  const [user, setUser] = React.useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isNaN(userId)) {
      toast({ title: "Error", description: "Invalid user ID.", variant: "destructive" });
      router.push("/users");
      return;
    }

    async function loadUser() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedUser = await fetchUserById(userId);
        setUser(fetchedUser);
      } catch (err: any) {
        setError(err.message || "Could not load user data.");
        toast({
          title: "Error Fetching User",
          description: err.message || "Could not load user data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [userId, router, toast]);

  const handleDeleteUser = async () => {
    if (!user) return;
    try {
      await deleteUser(user.id);
      toast({ title: "Success", description: "User deleted successfully." });
      router.push("/users");
    } catch (err: any) {
      toast({
        title: "Error Deleting User",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-9 w-9" />
            <div>
              <Skeleton className="h-8 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading User</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/users")}>Back to Users List</Button>
      </div>
    );
  }

  if (!user) {
    return <p className="text-center text-muted-foreground py-10">User not found.</p>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Back to Users">
            <Link href="/users"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
              <UserCircle className="mr-2 h-6 w-6 sm:h-7 sm:w-7" /> User Details: {user.name}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">Viewing information for user ID: {user.id}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-initial">
            <Link href={`/users/${user.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit User</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1 sm:flex-initial">
                <Trash2 className="mr-2 h-4 w-4" /> Delete User
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
                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">User Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailItem label="Full Name" value={user.name} />
          <DetailItem label="Phone Number" value={user.phone} />
          <DetailItem label="Email Address" value={user.email} />
          <DetailItem label="User Type" value={user.type} />
          {user.type === "B2B" && <DetailItem label="GSTIN" value={user.gstin} />}
           <div className="flex items-start space-x-2">
            <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={user.status?.toUpperCase() === 'ACTIVE' ? 'default' : 'outline'}
                       className={user.status?.toUpperCase() === 'ACTIVE' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'}>
                    {user.status || "N/A"}
                </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.addresses && user.addresses.length > 0 ? (
            user.addresses.map((address, index) => (
              <AddressCard key={address.id || index} address={address} isDefault={address.isDefault} />
            ))
          ) : (
            <p className="text-muted-foreground">No addresses found for this user.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Created At" value={user.createdAt ? format(new Date(user.createdAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
            <DetailItem label="Last Updated At" value={user.updatedAt ? format(new Date(user.updatedAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
        </CardContent>
      </Card>
    </div>
  );
}

