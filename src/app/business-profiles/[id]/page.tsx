
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  fetchBusinessProfileById,
  deleteBusinessProfile,
  fetchUsersForBusinessProfileByGstin, // New import
  type BusinessProfileDto,
  type AddressDto,
  type UserDto,
  type Page, // Import Page type
} from "@/lib/apiClient";
import { ChevronLeft, Edit, Trash2, Building2, MapPin, Users, CalendarDays, AlertCircle, Loader2, FileText, BadgeDollarSign, Link2, Briefcase } from "lucide-react";
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
    <Card className="bg-secondary/30 p-4 shadow-sm">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-base flex justify-between items-center">
          Address {address.id ? address.id.substring(0,6) + "..." : "N/A"} {address.type ? `(${address.type})` : ''}
          {isDefault && <Badge variant="default">Default</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <p><span className="font-medium">Line 1:</span> {address.line1 || "N/A"}</p>
        {address.line2 && <p><span className="font-medium">Line 2:</span> {address.line2}</p>}
        <p><span className="font-medium">City:</span> {address.city}</p>
        <p><span className="font-medium">State:</span> {address.state} ({address.stateCode})</p>
        <p><span className="font-medium">Postal:</span> {address.postalCode || "N/A"}</p>
        <p><span className="font-medium">Country:</span> {address.country || "N/A"}</p>
      </CardContent>
    </Card>
  );
}

export default function BusinessProfileDetailPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string; 
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<BusinessProfileDto | null>(null);
  const [linkedUsers, setLinkedUsers] = React.useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profileId) {
      toast({ title: "Error", description: "Invalid business profile ID.", variant: "destructive" });
      router.push("/business-profiles");
      return;
    }

    async function loadProfileAndUsers() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedProfile = await fetchBusinessProfileById(profileId);
        setProfile(fetchedProfile);

        if (fetchedProfile && fetchedProfile.gstin) {
          setIsLoadingUsers(true);
          try {
            const usersPage: Page<UserDto> = await fetchUsersForBusinessProfileByGstin(fetchedProfile.gstin);
            setLinkedUsers(usersPage.content);
          } catch (userError: any) {
            console.warn(`Failed to fetch users for GSTIN ${fetchedProfile.gstin}: ${userError.message}`);
            setLinkedUsers([]);
            // Optionally, toast a warning for user fetching failure if desired
            // toast({ title: "Warning", description: `Could not load linked users for ${fetchedProfile.companyName}.`, variant: "default" });
          } finally {
            setIsLoadingUsers(false);
          }
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
    loadProfileAndUsers();
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

  const profileStatusDisplay = profile.isActive ? "ACTIVE" : "INACTIVE";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Back to Business Profiles">
            <Link href="/business-profiles"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
              <Building2 className="mr-2 h-6 w-6 sm:h-7 sm:w-7" /> Profile: {profile.companyName}
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
                  This action cannot be undone. This will permanently delete the business profile "{profile.companyName}".
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
          <DetailItem label="Company Name" value={profile.companyName} icon={Building2}/>
          <DetailItem label="GSTIN" value={profile.gstin} icon={FileText} />
          <DetailItem label="Payment Terms" value={profile.paymentTerms} icon={CalendarDays}/>
          <DetailItem label="Credit Limit (Days)" value={profile.creditLimit} icon={BadgeDollarSign}/>
          <div className="flex items-start space-x-2">
              <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={profile.isActive ? "default" : "outline"}
                         className={profile.isActive ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-gray-500/20 text-gray-700 border-gray-500/30"}>
                      {profileStatusDisplay}
                  </Badge>
              </div>
            </div>
            <DetailItem label="PAN Number" value={profile.panNumber} icon={FileText} />
             {profile.notes && <DetailItem label="Notes" value={profile.notes} icon={FileText} className="md:col-span-2 lg:col-span-3" />}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Linked Users</CardTitle></CardHeader>
        <CardContent>
          {isLoadingUsers && <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading users...</div>}
          {!isLoadingUsers && linkedUsers.length === 0 && <p className="text-muted-foreground">No users linked to this profile.</p>}
          {!isLoadingUsers && linkedUsers.length > 0 && (
            <div className="space-y-3">
              {linkedUsers.map(user => {
                const membership = user.businessMemberships?.find(bm => bm.businessProfileId === profile.id);
                const roleInProfile = membership?.role || "N/A";
                return (
                  <Card key={user.id} className="p-3 bg-secondary/20 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div>
                        <Link href={`/users/${user.id}`} className="font-medium hover:underline flex items-center text-sm">
                          {user.name || `User ID: ${user.id}`} <Link2 className="h-3 w-3 ml-1.5 text-primary/70" />
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Phone: {user.phone || "N/A"}
                          {user.email && `, Email: ${user.email}`}
                        </p>
                      </div>
                      <div className="text-left sm:text-right mt-1 sm:mt-0">
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1.5"/> Role: {roleInProfile}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Addresses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {profile.addresses && profile.addresses.length > 0 ? (
            profile.addresses.map((address, index) => (
              <AddressCard key={address.id || index.toString()} address={address} isDefault={address.isDefault} />
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


    