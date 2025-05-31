
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label"; // Added import
import { useToast } from "@/hooks/use-toast";
import {
  fetchBusinessProfileById,
  updateBusinessProfile,
  fetchAllUsers,
  fetchUsersForBusinessProfileByGstin,
  addBusinessProfileMember,
  removeBusinessProfileMember,
  type BusinessProfileDto,
  type UpdateBusinessProfileRequest,
  type AddressDto as ApiAddressDto,
  type AddressCreateDto,
  type UserDto,
  type BusinessProfileMemberRole,
  type Page,
} from "@/lib/apiClient";
import { ChevronLeft, Save, Trash2, PlusCircle, Building2, Users, Loader2, UserPlus, UserMinus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StateCombobox } from "@/components/ui/state-combobox";
import { indianStates } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";


const addressSchema = z.object({
  id: z.string().optional().nullable(),
  line1: z.string().optional().nullable().or(z.literal("")),
  line2: z.string().optional().nullable().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  stateCode: z.string().min(1, "State code is required"),
  country: z.string().optional().nullable().or(z.literal("")).default("India"),
  postalCode: z.string().optional().nullable().or(z.literal("")),
  type: z.enum(["SHIPPING", "BILLING"]).optional().nullable().default("BILLING"),
  isDefault: z.boolean().optional().default(false),
});

const profileFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  gstin: z.string().min(1, "GSTIN is required")
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  paymentTerms: z.string().optional().nullable(),
  creditLimit: z.coerce.number({invalid_type_error: "Credit limit must be a number"}).min(0, "Credit limit cannot be negative").optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  addresses: z.array(addressSchema).min(1, "At least one address is required"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const PROFILE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;
const MEMBER_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;

interface BusinessMemberDisplayDto {
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: BusinessProfileMemberRole;
  initialRole?: BusinessProfileMemberRole; // To track changes
  isNew?: boolean; // To differentiate newly added members
}


export default function EditBusinessProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<BusinessProfileDto | null>(null);
  const [allCustomerUsers, setAllCustomerUsers] = React.useState<UserDto[]>([]);
  const [initialMembers, setInitialMembers] = React.useState<BusinessMemberDisplayDto[]>([]);
  const [currentMembers, setCurrentMembers] = React.useState<BusinessMemberDisplayDto[]>([]);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);

  const [showAddMemberDialog, setShowAddMemberDialog] = React.useState(false);
  const [userToAdd, setUserToAdd] = React.useState<string>("");
  const [roleForNewMember, setRoleForNewMember] = React.useState<BusinessProfileMemberRole>(MEMBER_ROLES[2]); // Default to Staff

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      companyName: "",
      gstin: "",
      paymentTerms: "NET 30",
      creditLimit: 30,
      status: "ACTIVE",
      addresses: [],
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
      setIsLoadingMembers(true);
      try {
        const fetchedProfile = await fetchBusinessProfileById(profileId);
        setProfile(fetchedProfile);

        const fetchedUsers = await fetchAllUsers();
        setAllCustomerUsers(fetchedUsers.filter(u => u.role === null || u.role === undefined));
        setIsLoadingUsers(false);

        if (fetchedProfile.gstin) {
          const membersPage: Page<UserDto> = await fetchUsersForBusinessProfileByGstin(fetchedProfile.gstin);
          const loadedMembers = membersPage.content.map(user => {
            const membership = user.businessMemberships?.find(bm => bm.businessProfileId === fetchedProfile.id);
            return {
              userId: user.id,
              name: user.name || `User ID: ${user.id}`,
              email: user.email,
              phone: user.phone,
              role: membership?.role || MEMBER_ROLES[2], // Default to Staff if no role found
              initialRole: membership?.role || MEMBER_ROLES[2],
            };
          });
          setInitialMembers(loadedMembers);
          setCurrentMembers(loadedMembers);
        } else {
          setInitialMembers([]);
          setCurrentMembers([]);
        }
        setIsLoadingMembers(false);


        const validStatus = fetchedProfile.isActive ? "ACTIVE" : "INACTIVE";
        let formAddresses = fetchedProfile.addresses?.map(addr => ({
          id: addr.id,
          line1: addr.line1 ?? "", line2: addr.line2 ?? "", city: addr.city ?? "",
          state: addr.state ?? "", stateCode: addr.stateCode ?? "",
          country: addr.country ?? "India", postalCode: addr.postalCode ?? "",
          type: addr.type as ("SHIPPING" | "BILLING" | undefined) ?? "BILLING",
          isDefault: addr.isDefault ?? false,
        })) ?? [];
        if (formAddresses.length === 0) {
          formAddresses.push({
            id: undefined, line1: "", line2: "", city: "", state: "", stateCode: "", country: "India",
            postalCode: "", type: "BILLING", isDefault: true
          });
        }

        form.reset({
          companyName: fetchedProfile.companyName ?? "",
          gstin: fetchedProfile.gstin ?? "",
          paymentTerms: fetchedProfile.paymentTerms ?? "NET 30",
          creditLimit: fetchedProfile.creditLimit ?? 30,
          status: validStatus,
          addresses: formAddresses,
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
      }
    }
    loadData();
  }, [profileId, router, toast, form]);

  const handleAddMember = () => {
    if (!userToAdd || !roleForNewMember) {
      toast({ title: "Error", description: "Please select a user and a role.", variant: "destructive" });
      return;
    }
    const userDetails = allCustomerUsers.find(u => u.id === userToAdd);
    if (!userDetails) {
        toast({ title: "Error", description: "Selected user not found.", variant: "destructive" });
        return;
    }
    setCurrentMembers(prev => [...prev, {
      userId: userDetails.id,
      name: userDetails.name || `User ID: ${userDetails.id}`,
      email: userDetails.email,
      phone: userDetails.phone,
      role: roleForNewMember,
      isNew: true,
    }]);
    setShowAddMemberDialog(false);
    setUserToAdd("");
    setRoleForNewMember(MEMBER_ROLES[2]);
  };

  const handleRemoveMember = (userIdToRemove: string) => {
    setCurrentMembers(prev => prev.filter(member => member.userId !== userIdToRemove));
  };

  const handleMemberRoleChange = (userIdToUpdate: string, newRole: BusinessProfileMemberRole) => {
    setCurrentMembers(prev => prev.map(member => 
      member.userId === userIdToUpdate ? { ...member, role: newRole } : member
    ));
  };

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const profilePayload: UpdateBusinessProfileRequest = {
        companyName: data.companyName,
        gstin: data.gstin,
        paymentTerms: data.paymentTerms || undefined,
        creditLimit: data.creditLimit,
        status: data.status,
        addresses: data.addresses?.map(addr => {
          const { id, ...rest } = addr;
          const apiAddr: AddressCreateDto | ApiAddressDto = {
            ...rest,
            line1: rest.line1 || undefined, line2: rest.line2 || undefined,
            type: rest.type || "BILLING", country: rest.country || "India",
            postalCode: rest.postalCode || undefined, city: rest.city,
            state: rest.state, stateCode: rest.stateCode, isDefault: rest.isDefault,
          };
          if (id) { (apiAddr as ApiAddressDto).id = id; }
          return apiAddr;
        }) || [],
      };

      await updateBusinessProfile(profileId, profilePayload);
      toast({ title: "Success", description: "Business profile details updated." });

      // Member updates
      const membersToRemove = initialMembers.filter(im => !currentMembers.some(cm => cm.userId === im.userId));
      for (const member of membersToRemove) {
        try {
          await removeBusinessProfileMember(profileId, member.userId);
          toast({ title: "Member Removed", description: `${member.name} unlinked.`, variant: "default" });
        } catch (memberError: any) {
          toast({ title: "Error Removing Member", description: `Could not unlink ${member.name}: ${memberError.message}`, variant: "destructive" });
        }
      }

      for (const member of currentMembers) {
        const initialMember = initialMembers.find(im => im.userId === member.userId);
        if (member.isNew || (initialMember && initialMember.role !== member.role)) {
          try {
            await addBusinessProfileMember(profileId, { userId: member.userId, role: member.role });
            toast({ title: member.isNew ? "Member Added" : "Member Role Updated", description: `${member.name} processed.`, variant: "default" });
          } catch (memberError: any) {
            toast({ title: "Error Updating Member", description: `Could not process ${member.name}: ${memberError.message}`, variant: "destructive" });
          }
        }
      }
      
      router.push("/business-profiles");
      router.refresh();

    } catch (error: any) {
      console.error("Error updating business profile or members:", error);
      toast({
        title: "Error During Update",
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
        <div className="flex items-center gap-2 md:gap-4"><Skeleton className="h-9 w-9" /><Skeleton className="h-8 w-3/5 mb-1" /></div>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 md:gap-6"><Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /></CardContent></Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-32 mt-2"/></CardContent></Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-32" /></CardContent></Card>
        <CardFooter className="flex justify-end gap-2 pt-6"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" /></CardFooter>
      </div>
    );
  }

  if (!profile) { return <p className="text-center text-muted-foreground py-10">Profile not found or failed to load.</p>; }

  const availableUsersToAdd = allCustomerUsers.filter(u => !currentMembers.some(cm => cm.userId === u.id));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Back to Business Profiles"><Link href="/business-profiles"><ChevronLeft className="h-4 w-4" /></Link></Button>
        <div><h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center"><Building2 className="mr-2 h-6 w-6" />Edit Business Profile: {profile.companyName}</h1><p className="text-muted-foreground text-sm sm:text-base">Update profile details and linked users.</p></div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="gstin" render={({ field }) => (<FormItem><FormLabel>GSTIN *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="paymentTerms" render={({ field }) => (<FormItem><FormLabel>Payment Terms</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="creditLimit" render={({ field }) => (<FormItem><FormLabel>Credit Limit (Days)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{PROFILE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Linked Users</CardTitle>
                    <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm"><UserPlus className="mr-2 h-4 w-4"/> Add User</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add User to Business Profile</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="user_to_add">User</Label>
                                    <Select value={userToAdd} onValueChange={setUserToAdd}>
                                        <SelectTrigger id="user_to_add"><SelectValue placeholder="Select a user to add"/></SelectTrigger>
                                        <SelectContent>
                                            {isLoadingUsers ? <SelectItem value="loading" disabled>Loading users...</SelectItem> :
                                            availableUsersToAdd.length === 0 ? <SelectItem value="none" disabled>No unlinked users available</SelectItem> :
                                            availableUsersToAdd.map(user => (
                                                <SelectItem key={user.id} value={user.id.toString()}>{user.name} ({user.email || user.phone})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role_for_new_member">Role</Label>
                                    <Select value={roleForNewMember} onValueChange={(value) => setRoleForNewMember(value as BusinessProfileMemberRole)}>
                                        <SelectTrigger id="role_for_new_member"><SelectValue placeholder="Select role"/></SelectTrigger>
                                        <SelectContent>
                                            {MEMBER_ROLES.map(role => (<SelectItem key={role} value={role}>{role}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                <Button type="button" onClick={handleAddMember} disabled={!userToAdd || isLoadingUsers}>Add User</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <CardDescription>Manage users linked to this business profile and their roles.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingMembers ? (
                    <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading members...</div>
                ) : currentMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No users currently linked to this profile.</p>
                ) : (
                    <ScrollArea className="h-72">
                        <div className="space-y-3 pr-2">
                            {currentMembers.map((member) => (
                                <Card key={member.userId} className="p-3 bg-secondary/20 shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                        <div className="flex-grow">
                                            <p className="font-medium text-sm">{member.name}</p>
                                            <p className="text-xs text-muted-foreground">{member.email || member.phone}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 sm:mt-0 w-full sm:w-auto">
                                            <Select value={member.role} onValueChange={(newRole) => handleMemberRoleChange(member.userId, newRole as BusinessProfileMemberRole)}>
                                                <SelectTrigger className="h-8 text-xs w-full sm:w-32"><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    {MEMBER_ROLES.map(role => (<SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => handleRemoveMember(member.userId)}><UserMinus className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>Addresses *</CardTitle><CardDescription>At least one address is required. Only City and State are mandatory.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {addressFields.map((formField, index) => (
                <Card key={formField.id} className="p-4 space-y-3 bg-secondary/50">
                  <div className="flex justify-between items-center"><h4 className="font-medium">Address {index + 1} {form.watch(`addresses.${index}.id`) ? `(ID: ${form.watch(`addresses.${index}.id`)?.substring(0, 6)}...)` : "(New)"}</h4>{addressFields.length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>)}</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input type="hidden" {...form.register(`addresses.${index}.id`)} />
                    <FormField control={form.control} name={`addresses.${index}.line1`} render={({ field: f }) => (<FormItem><FormLabel>Line 1</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`addresses.${index}.line2`} render={({ field: f }) => (<FormItem><FormLabel>Line 2</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`addresses.${index}.city`} render={({ field: f }) => (<FormItem><FormLabel>City *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>)} />
                    <Controller control={form.control} name={`addresses.${index}.state`} render={({ field: stateField }) => (
                        <FormItem><FormLabel>State *</FormLabel>
                          <StateCombobox value={stateField.value}
                            onValueChange={(newState) => {
                              form.setValue(`addresses.${index}.state`, newState || "");
                              const selectedStateObj = indianStates.find(s => s.name === newState);
                              form.setValue(`addresses.${index}.stateCode`, selectedStateObj?.code || "");
                            }}
                            onStateCodeChange={() => { }}/>
                          <FormMessage>{form.formState.errors.addresses?.[index]?.state?.message}</FormMessage>
                          <FormField control={form.control} name={`addresses.${index}.stateCode`} render={({ field: f }) => (<FormItem className="sr-only"><FormLabel>State Code *</FormLabel><FormControl><Input {...f} readOnly /></FormControl><FormMessage /></FormItem>)} />
                        </FormItem>)} />
                    <FormField control={form.control} name={`addresses.${index}.country`} render={({ field: f }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`addresses.${index}.postalCode`} render={({ field: f }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`addresses.${index}.type`} render={({ field: f }) => (<FormItem><FormLabel>Address Type</FormLabel><Select onValueChange={f.onChange} value={f.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{ADDRESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <Controller control={form.control} name={`addresses.${index}.isDefault`} render={({ field: f }) => (<FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2"><FormControl><Button type="button" variant={f.value ? "default" : "outline"} onClick={() => { if (!f.value) { form.getValues("addresses")?.forEach((_, addrIdx) => { if (index !== addrIdx) { form.setValue(`addresses.${addrIdx}.isDefault`, false); } }); } form.setValue(`addresses.${index}.isDefault`, !f.value); }} className="w-full">{f.value ? "Default Address" : "Set as Default"}</Button></FormControl></FormItem>)} />
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={() => appendAddress({ id: null, line1: '', line2: '', city: '', state: '', stateCode: '', country: 'India', postalCode: '', isDefault: addressFields.length === 0, type: 'BILLING' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Address
              </Button>
              <FormMessage>{form.formState.errors.addresses?.message || form.formState.errors.addresses?.root?.message}</FormMessage>
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

