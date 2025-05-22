
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchBusinessProfileById, 
  updateBusinessProfile, 
  fetchAllUsers, 
  type BusinessProfileDto, 
  type UpdateBusinessProfileRequest, 
  type AddressDto as ApiAddressDto, 
  type AddressCreateDto,
  type UserDto
} from "@/lib/apiClient";
import { ChevronLeft, Save, Trash2, PlusCircle, Building2, Users, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// Form-specific Address schema, ID is optional
const addressSchema = z.object({
  id: z.string().optional().nullable(), 
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional().nullable().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  type: z.enum(["SHIPPING", "BILLING"]).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

const profileFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  gstin: z.string().min(1, "GSTIN is required")
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  paymentTerms: z.string().optional().nullable().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  addresses: z.array(addressSchema).optional(),
  userIds: z.array(z.string()).optional(), 
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const PROFILE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;

export default function EditBusinessProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string; 
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<BusinessProfileDto | null>(null);
  const [allUsers, setAllUsers] = React.useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      gstin: "",
      paymentTerms: "",
      status: "ACTIVE",
      addresses: [],
      userIds: [],
    },
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  React.useEffect(() => {
    if (!profileId) {
      toast({ title: "Error", description: "Invalid business profile ID.", variant: "destructive" });
      router.push("/business-profiles");
      return;
    }

    async function loadData() {
      setIsLoading(true);
      setIsLoadingUsers(true);
      try {
        const fetchedProfilePromise = fetchBusinessProfileById(profileId);
        const fetchedUsersPromise = fetchAllUsers();
        
        const [fetchedProfile, fetchedUsers] = await Promise.all([
          fetchedProfilePromise,
          fetchedUsersPromise
        ]);
        
        setProfile(fetchedProfile);
        setAllUsers(fetchedUsers);

        const currentStatus = fetchedProfile.status?.toUpperCase();
        const validStatus = PROFILE_STATUSES.includes(currentStatus as any) ? currentStatus as "ACTIVE" | "INACTIVE" : "ACTIVE";

        form.reset({
          name: fetchedProfile.name,
          gstin: fetchedProfile.gstin,
          paymentTerms: fetchedProfile.paymentTerms ?? "",
          status: validStatus,
          addresses: fetchedProfile.addresses?.map(addr => ({ 
            ...addr, 
            id: addr.id, 
            type: addr.type as ("SHIPPING" | "BILLING" | undefined) ?? undefined,
            line2: addr.line2 ?? "",
          })) ?? [],
          userIds: fetchedProfile.userIds?.map(id => String(id)) ?? [], 
        });
      } catch (error: any) {
        console.error("Error fetching data for edit business profile:", error);
        toast({
          title: "Error Fetching Data",
          description: error.message || "Could not load profile or user data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsLoadingUsers(false);
      }
    }
    loadData();
  }, [profileId, router, toast, form]);

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const payload: UpdateBusinessProfileRequest = {
        name: data.name,
        gstin: data.gstin,
        paymentTerms: data.paymentTerms || undefined,
        status: data.status,
        addresses: data.addresses?.map(addr => {
          const { id, ...rest } = addr;
          const apiAddr: AddressCreateDto | ApiAddressDto = {
            ...rest,
            line2: rest.line2 || undefined,
            type: rest.type || undefined,
          };
          if (id) { 
            (apiAddr as ApiAddressDto).id = id;
          }
          return apiAddr;
        }) || [],
        userIds: data.userIds || [], 
      };
      
      await updateBusinessProfile(profileId, payload);
      toast({
        title: "Success",
        description: "Business profile updated successfully.",
      });
      router.push("/business-profiles");
      router.refresh(); 
    } catch (error: any) {
      console.error("Error updating business profile:", error);
      toast({
        title: "Error Updating Profile",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        <div className="flex items-center gap-2 md:gap-4">
          <Skeleton className="h-9 w-9" /><Skeleton className="h-8 w-3/5 mb-1" />
        </div>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
        <CardFooter className="flex justify-end gap-2 pt-6">
          <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" />
        </CardFooter>
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-muted-foreground py-10">Profile not found or failed to load.</p>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Back to Business Profiles">
            <Link href="/business-profiles"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Building2 className="mr-2 h-6 w-6" />Edit Business Profile: {profile.name}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Update profile details and linked users.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="gstin" render={({ field }) => (
                <FormItem><FormLabel>GSTIN *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                <FormItem><FormLabel>Payment Terms</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{PROFILE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}/>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>Linked Users</CardTitle><CardDescription>Select users associated with this business profile.</CardDescription></CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="userIds"
                render={({ field }) => (
                  <FormItem>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                            {field.value && field.value.length > 0 
                              ? `${field.value.length} user(s) selected` 
                              : "Select users..."}
                            <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        {isLoadingUsers ? (
                            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading users...
                            </div>
                        ) : allUsers.length === 0 ? (
                            <p className="p-4 text-center text-sm text-muted-foreground">No users available.</p>
                        ) : (
                          <ScrollArea className="h-72">
                            <div className="p-4 space-y-2">
                            {allUsers.map((user) => (
                              <FormItem key={user.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(user.id)} 
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), user.id])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== user.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">
                                  {user.name} ({user.email || user.phone})
                                </FormLabel>
                              </FormItem>
                            ))}
                            </div>
                          </ScrollArea>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {addressFields.map((formField, index) => ( 
                <Card key={formField.id} className="p-4 space-y-3 bg-secondary/50"> 
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Address {index + 1} {form.watch(`addresses.${index}.id`) ? `(ID: ${form.watch(`addresses.${index}.id`)})` : "(New)"}</h4>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input type="hidden" {...form.register(`addresses.${index}.id`)} />
                    <FormField control={form.control} name={`addresses.${index}.line1`} render={({ field: f }) => (<FormItem><FormLabel>Line 1 *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.line2`} render={({ field: f }) => (<FormItem><FormLabel>Line 2</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.city`} render={({ field: f }) => (<FormItem><FormLabel>City *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.state`} render={({ field: f }) => (<FormItem><FormLabel>State *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.country`} render={({ field: f }) => (<FormItem><FormLabel>Country *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.postalCode`} render={({ field: f }) => (<FormItem><FormLabel>Postal Code *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.type`} render={({ field: f }) => (
                      <FormItem><FormLabel>Address Type</FormLabel>
                        <Select onValueChange={f.onChange} value={f.value ?? ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>{ADDRESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )}/>
                    <Controller control={form.control} name={`addresses.${index}.isDefault`}
                      render={({ field: f }) => (
                        <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                          <FormControl>
                            <Button type="button" variant={f.value ? "default" : "outline"}
                              onClick={() => {
                                if (!f.value) {form.getValues("addresses")?.forEach((_, addrIdx) => {if (index !== addrIdx) {form.setValue(`addresses.${addrIdx}.isDefault`, false);}});}
                                form.setValue(`addresses.${index}.isDefault`, !f.value);
                              }} className="w-full">
                              {f.value ? "Default Address" : "Set as Default"}
                            </Button>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={() => appendAddress({ id: null, line1: '', city: '', state: '', country: '', postalCode: '', isDefault: addressFields.length === 0, type: 'SHIPPING' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Address
              </Button>
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}
