
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  createBusinessProfile, 
  createBusinessProfileWithUser,
  fetchAllUsers,
  type CreateBusinessProfileRequest, 
  type CreateBusinessProfileWithUserRequest,
  type AddressCreateDto,
  type UserDto
} from "@/lib/apiClient";
import { ChevronLeft, PlusCircle, Save, Trash2, Building2, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { StateCombobox } from "@/components/ui/state-combobox";
import { indianStates } from "@/lib/constants";

const addressSchema = z.object({
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
  creationMode: z.enum(["linkExistingUser", "createNewUser"]).default("linkExistingUser"),
  creatorUserId: z.string().optional(), // string because select value is string
  newUserName: z.string().optional(),
  newUserPhone: z.string().optional().refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
    message: "Invalid phone number format, e.g., +919876543210",
  }),
  newUserEmail: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  
  companyName: z.string().min(1, "Company name is required"),
  gstin: z.string().min(1, "GSTIN is required")
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  paymentTerms: z.string().optional().nullable(),
  creditLimit: z.coerce.number({invalid_type_error: "Credit limit must be a number"}).min(0, "Credit limit cannot be negative").optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  addresses: z.array(addressSchema).min(1, "At least one address is required"),
}).superRefine((data, ctx) => {
  if (data.creationMode === "linkExistingUser" && !data.creatorUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Creator User selection is required.",
      path: ["creatorUserId"],
    });
  }
  if (data.creationMode === "createNewUser") {
    if (!data.newUserName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New User Name is required.",
        path: ["newUserName"],
      });
    }
    if (!data.newUserPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New User Phone is required.",
        path: ["newUserPhone"],
      });
    }
  }
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const PROFILE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;

export default function CreateBusinessProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [allUsers, setAllUsers] = React.useState<UserDto[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      creationMode: "linkExistingUser",
      companyName: "",
      gstin: "",
      paymentTerms: "NET 30",
      creditLimit: 30,
      status: "ACTIVE",
      addresses: [{ 
        line1: "", city: "", state: "", stateCode: "", country: "India", 
        postalCode: "", type: "BILLING", isDefault: true 
      }],
      creatorUserId: undefined,
      newUserName: "",
      newUserPhone: "",
      newUserEmail: ""
    },
  });

  const creationMode = form.watch("creationMode");

  React.useEffect(() => {
    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        const users = await fetchAllUsers();
        setAllUsers(users.filter(u => u.role === null || u.role === undefined)); // Filter for customers
      } catch (error: any) {
        toast({
          title: "Error Fetching Users",
          description: error.message || "Could not load users for selection.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUsers(false);
      }
    }
    if (creationMode === "linkExistingUser") {
      loadUsers();
    }
  }, [toast, creationMode]);
  
  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  React.useEffect(() => {
    if (addressFields.length === 0) {
      appendAddress({
        line1: "", city: "", state: "", stateCode: "", country: "India",
        postalCode: "", type: "BILLING", isDefault: true,
      });
    }
  }, [addressFields, appendAddress]);


  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    
    const commonBusinessProfileData = {
      companyName: data.companyName,
      gstin: data.gstin,
      paymentTerms: data.paymentTerms || undefined,
      creditLimit: data.creditLimit,
      status: data.status,
      addresses: data.addresses.map(addr => ({
          ...addr,
          line1: addr.line1 || undefined,
          line2: addr.line2 || undefined,
          type: addr.type || undefined,
          country: addr.country || undefined,
          postalCode: addr.postalCode || undefined,
          city: addr.city,
          state: addr.state,
          stateCode: addr.stateCode,
          isDefault: addr.isDefault,
      }))
    };

    try {
      if (data.creationMode === "linkExistingUser") {
        if (!data.creatorUserId) {
            toast({title: "Error", description: "Creator user must be selected.", variant: "destructive"});
            setIsSubmitting(false);
            return;
        }
        const payload: CreateBusinessProfileRequest = {
          name: data.companyName, // API expects 'name' here
          gstin: data.gstin,
          paymentTerms: data.paymentTerms || undefined,
          creditLimit: data.creditLimit,
          status: data.status,
          addresses: data.addresses.map(addr => ({
              ...addr,
              line1: addr.line1 || undefined,
              line2: addr.line2 || undefined,
              type: addr.type || undefined,
              country: addr.country || undefined,
              postalCode: addr.postalCode || undefined,
          })),
        };
        await createBusinessProfile(payload, data.creatorUserId);
      } else { // createNewUser mode
        const userAddresses: AddressCreateDto[] = data.addresses.length > 0 ? [{
            ...data.addresses[0], // Use first business address for user
            type: "BILLING", 
            isDefault: true,
            line1: data.addresses[0].line1 || undefined,
            line2: data.addresses[0].line2 || undefined,
            country: data.addresses[0].country || undefined,
            postalCode: data.addresses[0].postalCode || undefined,
        }] : [];

        const payloadWithNewUser: CreateBusinessProfileWithUserRequest = {
          user: {
            name: data.newUserName!,
            phone: data.newUserPhone!,
            email: data.newUserEmail || undefined,
            status: "ACTIVE",
            addresses: userAddresses,
          },
          businessProfile: {
            name: data.companyName, // API expects 'name' here
            gstin: data.gstin,
            paymentTerms: data.paymentTerms || undefined,
            creditLimit: data.creditLimit,
            status: data.status,
            addresses: data.addresses.map(addr => ({
              ...addr,
              line1: addr.line1 || undefined,
              line2: addr.line2 || undefined,
              type: addr.type || undefined,
              country: addr.country || undefined,
              postalCode: addr.postalCode || undefined,
            })),
          }
        };
        await createBusinessProfileWithUser(payloadWithNewUser);
      }
      
      toast({
        title: "Success",
        description: "Business profile created successfully.",
      });
      router.push("/business-profiles");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error Creating Profile",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Back to Business Profiles">
            <Link href="/business-profiles"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Building2 className="mr-2 h-6 w-6" />Create New Business Profile
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Fill in the details to add a new business profile.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Creation Mode</CardTitle></CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="creationMode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="linkExistingUser" /></FormControl>
                          <FormLabel className="font-normal">Link to Existing User</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="createNewUser" /></FormControl>
                          <FormLabel className="font-normal">Create New User with Profile</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {creationMode === "linkExistingUser" && (
            <Card className="shadow-md">
              <CardHeader><CardTitle>Link to Existing User</CardTitle></CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="creatorUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creator User *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingUsers}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {isLoadingUsers ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : allUsers.length > 0 ? (
                            allUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.email || user.phone})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no_users" disabled>No customer users available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select an existing customer user to associate with this business profile.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {creationMode === "createNewUser" && (
            <Card className="shadow-md">
              <CardHeader><CardTitle>New User Details</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="newUserName" render={({ field }) => (
                  <FormItem><FormLabel>New User Name *</FormLabel><FormControl><Input placeholder="e.g., Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="newUserPhone" render={({ field }) => (
                  <FormItem><FormLabel>New User Phone *</FormLabel><FormControl><Input placeholder="e.g., +919000000000" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="newUserEmail" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>New User Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="e.g., jane.smith@example.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )}/>
              </CardContent>
               <CardDescription className="px-6 pb-4 text-xs text-muted-foreground">The first address entered for the business profile below will also be used as the primary address for this new user.</CardDescription>
            </Card>
          )}

          <Card className="shadow-md">
            <CardHeader><CardTitle>Business Profile Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Company Name *</FormLabel><FormControl><Input placeholder="e.g., Acme Corp" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="gstin" render={({ field }) => (
                <FormItem><FormLabel>GSTIN *</FormLabel><FormControl><Input placeholder="e.g., 22AAAAA0000A1Z5" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                <FormItem><FormLabel>Payment Terms</FormLabel><FormControl><Input placeholder="e.g., Net 30 Days" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="creditLimit" render={({ field }) => (
                <FormItem><FormLabel>Credit Limit (Days)</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>{PROFILE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}/>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>Addresses *</CardTitle><CardDescription>At least one address is required. Only City and State are mandatory.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {addressFields.map((field, index) => (
                <Card key={field.id} className="p-4 space-y-3 bg-secondary/50">
                  <div className="flex justify-between items-center">
                     <h4 className="font-medium">Address {index + 1}</h4>
                    {addressFields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name={`addresses.${index}.line1`} render={({ field: f }) => (<FormItem><FormLabel>Line 1</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.line2`} render={({ field: f }) => (<FormItem><FormLabel>Line 2</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.city`} render={({ field: f }) => (<FormItem><FormLabel>City *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>)}/>
                     <Controller
                      control={form.control}
                      name={`addresses.${index}.state`}
                      render={({ field: stateField }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <StateCombobox
                            value={stateField.value}
                            onValueChange={(newState) => {
                              form.setValue(`addresses.${index}.state`, newState || "");
                              const selectedStateObj = indianStates.find(s => s.name === newState);
                              form.setValue(`addresses.${index}.stateCode`, selectedStateObj?.code || "");
                            }}
                            onStateCodeChange={() => {}}
                          />
                          <FormMessage>{form.formState.errors.addresses?.[index]?.state?.message}</FormMessage>
                           <FormField control={form.control} name={`addresses.${index}.stateCode`} render={({ field: f }) => (
                              <FormItem className="sr-only"><FormLabel>State Code *</FormLabel><FormControl><Input {...f} readOnly /></FormControl><FormMessage /></FormItem>
                          )}/>
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`addresses.${index}.country`} render={({ field: f }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`addresses.${index}.postalCode`} render={({ field: f }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
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
                                f.onChange(!f.value);
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
              <Button type="button" variant="outline" onClick={() => appendAddress({ line1: '', city: '', state: '', stateCode: '', country: 'India', postalCode: '', isDefault: addressFields.length === 0, type: 'BILLING' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Address
              </Button>
              <FormMessage>{form.formState.errors.addresses?.message || form.formState.errors.addresses?.root?.message}</FormMessage>
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><Save className="mr-2 h-4 w-4" /> Create Profile</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}

    