
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchBusinessProfileById, deleteBusinessProfile, fetchUserById, type BusinessProfileDto, type AddressDto, type UserDto } from "@/lib/apiClient";
import { ChevronLeft, Edit, Trash2, Building2, MapPin, Users, CalendarDays, AlertCircle, Loader2 } from "lucide-react";
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

export default function BusinessProfileDetailPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = Number(params.id);
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<BusinessProfileDto | null>(null);
  const [linkedUsers, setLinkedUsers] = React.useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isNaN(profileId)) {
      toast({ title: "Error", description: "Invalid business profile ID.", variant: "destructive" });
      router.push("/business-profiles");
      return;
    }

    async function loadProfile() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedProfile = await fetchBusinessProfileById(profileId);
        setProfile(fetchedProfile);
        if (fetchedProfile.userIds && fetchedProfile.userIds.length > 0) {
          setIsLoadingUsers(true);
          const usersDataPromises = fetchedProfile.userIds.map(id => 
            fetchUserById(id).catch((userError) => {
              console.warn(`Failed to fetch user with ID: ${id}. Error: ${userError.message}`);
              return null; 
            })
          );
          const usersData = await Promise.all(usersDataPromises);
          setLinkedUsers(usersData.filter(u => u !== null) as UserDto[]);
          setIsLoadingUsers(false);
        } else {
          setLinkedUsers([]);
          setIsLoadingUsers(false);
        }
      } catch (err: any) {
        console.error("Error fetching business profile details:", err);
        setError(err.message || "Could not load business profile data.");
        toast({
          title: "Error Fetching Profile",
          description: err.message || "Could not load business profile data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [profileId, router, toast]);

  const handleDeleteProfile = async () => {
    if (!profile) return;
    try {
      await deleteBusinessProfile(profile.id);
      toast({ title: "Success", description: "Business profile deleted successfully." });
      router.push("/business-profiles");
      router.refresh(); 
    } catch (err: any) {
      console.error("Error deleting business profile:", err);
      toast({
        title: "Error Deleting Profile",
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
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
             <Skeleton className="h-5 w-1/2" />
          </CardContent>
        </Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
         <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/business-profiles")}>Back to Business Profiles</Button>
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-muted-foreground py-10">Business profile not found.</p>;
  }

  const profileStatus = profile.status ? (profile.status).toUpperCase() : "N/A";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Back to Business Profiles">
            <Link href="/business-profiles"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
              <Building2 className="mr-2 h-6 w-6 sm:h-7 sm:w-7" /> Profile: {profile.name}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">Viewing details for business profile ID: {profile.id}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-initial">
            <Link href={`/business-profiles/${profile.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit Profile</Link>
          </Button>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1 sm:flex-initial">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Profile
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the business profile "{profile.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Company Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailItem label="Company Name" value={profile.name} />
          <DetailItem label="GSTIN" value={profile.gstin} />
          <DetailItem label="Payment Terms" value={profile.paymentTerms} />
          <div className="flex items-start space-x-2">
              <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={profileStatus === "ACTIVE" ? "default" : "outline"}
                         className={profileStatus === "ACTIVE" ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-gray-500/20 text-gray-700 border-gray-500/30"}>
                      {profileStatus}
                  </Badge>
              </div>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Linked Users</CardTitle></CardHeader>
        <CardContent>
          {isLoadingUsers && <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading users...</div>}
          {!isLoadingUsers && linkedUsers.length === 0 && <p className="text-muted-foreground">No users linked to this profile.</p>}
          {!isLoadingUsers && linkedUsers.length > 0 && (
            <ul className="space-y-1 list-disc list-inside">
              {linkedUsers.map(user => (
                <li key={user.id} className="text-sm">{user.name} (ID: {user.id}, Email: {user.email || 'N/A'}, Phone: {user.phone || 'N/A'})</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Addresses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {profile.addresses && profile.addresses.length > 0 ? (
            profile.addresses.map((address, index) => (
              <AddressCard key={address.id || index} address={address} isDefault={address.isDefault} />
            ))
          ) : (
            <p className="text-muted-foreground">No addresses found for this profile.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">System Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Created At" value={profile.createdAt ? format(new Date(profile.createdAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
            <DetailItem label="Last Updated At" value={profile.updatedAt ? format(new Date(profile.updatedAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
        </CardContent>
      </Card>
    </div>
  );
}
