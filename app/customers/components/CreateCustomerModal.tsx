"use client";

import { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  UserPlus,
  Loader2,
  Building,
  CreditCard
} from "lucide-react";
import { type Customer, createCustomer } from "@/lib/customers";
import { type CreateCustomerAccountPayload } from "@/lib/customer-accounts";
import { DocumentForm, DocumentData } from "./DocumentForm";
import { uploadDocument } from "@/lib/documents";

interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCustomerModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomerModalProps) {
  const { toast } = useToast();
  const { companyId, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [customerType, setCustomerType] = useState("individual");
  const [status, setStatus] = useState("active");
  const [preferredCommunication, setPreferredCommunication] = useState("phone");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  
  // Company-specific fields
  const [businessName, setBusinessName] = useState("");
  const [natureOfBusiness, setNatureOfBusiness] = useState("");
  const [pinNumber, setPinNumber] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [contactPersonEmail, setContactPersonEmail] = useState("");
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const paymentMethodRef = useRef("cash");
  
  // Credit account fields (only shown if payment method is credit)
  const [creditRequired, setCreditRequired] = useState("");
  const [creditPeriodRequired, setCreditPeriodRequired] = useState("");
  const [certificateOfIncorporationNumber, setCertificateOfIncorporationNumber] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");
  const [currentlyDefaulted, setCurrentlyDefaulted] = useState(false);
  const [creditTerms, setCreditTerms] = useState("");
  const [directors, setDirectors] = useState([{ name: "", idPassportNumber: "", pin: "", phoneNumber: "" }]);
  const [authorisedPurchasePersons, setAuthorisedPurchasePersons] = useState([{ name: "", phoneNumber: "" }]);
  const [suppliers, setSuppliers] = useState([{ name: "", contactPersonName: "", phoneNumber: "", creditLimit: "" }]);
  const [bankDetails, setBankDetails] = useState([{ bankName: "", branch: "", accountNumber: "" }]);
  
  // Documents state
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setAddress("");
    setCity("");
    setState("");
    setCountry("");
    setPostalCode("");
    setCustomerType("individual");
    setStatus("active");
    setPreferredCommunication("phone");
    setNotes("");
    setTags("");
    
    // Reset company-specific fields
    setBusinessName("");
    setNatureOfBusiness("");
    setPinNumber("");
    setContactPersonName("");
    setContactPersonPhone("");
    setContactPersonEmail("");
    
    // Reset payment method
    setPaymentMethod("cash");
    paymentMethodRef.current = "cash";
    
    // Remove documents reset
    // Reset credit account fields
    setCreditRequired("");
    setCreditPeriodRequired("");
    setCertificateOfIncorporationNumber("");
    setCompanyType("");
    setAnnualTurnover("");
    setCurrentlyDefaulted(false);
    setCreditTerms("");
    setDirectors([{ name: "", idPassportNumber: "", pin: "", phoneNumber: "" }]);
    setAuthorisedPurchasePersons([{ name: "", phoneNumber: "" }]);
    setSuppliers([{ name: "", contactPersonName: "", phoneNumber: "", creditLimit: "" }]);
    setBankDetails([{ bankName: "", branch: "", accountNumber: "" }]);
    setDocuments([]);
  };

  const validateForm = () => {
    // Only name is required for creating a customer
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return false;
    }

    // Optional: validate email format if provided
    if (email && !email.includes("@")) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    // If payment method is credit, validate credit account fields
    if (paymentMethodRef.current === "credit") {
      // Validate directors if any are provided
      const hasDirectors = directors.some(d => d.name || d.idPassportNumber || d.pin || d.phoneNumber);
      if (hasDirectors) {
        for (let i = 0; i < directors.length; i++) {
          const director = directors[i];
          // If any field is filled, name and idPassportNumber are required
          if (director.name || director.idPassportNumber || director.pin || director.phoneNumber) {
            if (!director.name.trim()) {
              toast({
                title: "Validation Error",
                description: `Director ${i + 1}: Name is required`,
                variant: "destructive",
              });
              return false;
            }
            if (!director.idPassportNumber.trim()) {
              toast({
                title: "Validation Error",
                description: `Director ${i + 1}: ID/Passport number is required`,
                variant: "destructive",
              });
              return false;
            }
          }
        }
      }

      // Validate authorised purchase persons if any are provided
      const hasAuthorisedPersons = authorisedPurchasePersons.some(p => p.name || p.phoneNumber);
      if (hasAuthorisedPersons) {
        for (let i = 0; i < authorisedPurchasePersons.length; i++) {
          const person = authorisedPurchasePersons[i];
          // If any field is filled, name is required
          if (person.name || person.phoneNumber) {
            if (!person.name.trim()) {
              toast({
                title: "Validation Error",
                description: `Authorised Person ${i + 1}: Name is required`,
                variant: "destructive",
              });
              return false;
            }
          }
        }
      }

      // Validate suppliers if any are provided
      const hasSuppliers = suppliers.some(s => s.name || s.contactPersonName || s.phoneNumber || s.creditLimit);
      if (hasSuppliers) {
        for (let i = 0; i < suppliers.length; i++) {
          const supplier = suppliers[i];
          // If any field is filled, name is required
          if (supplier.name || supplier.contactPersonName || supplier.phoneNumber || supplier.creditLimit) {
            if (!supplier.name.trim()) {
              toast({
                title: "Validation Error",
                description: `Supplier ${i + 1}: Name is required`,
                variant: "destructive",
              });
              return false;
            }
          }
        }
      }

      // Validate bank details if any are provided
      const hasBankDetails = bankDetails.some(b => b.bankName || b.branch || b.accountNumber);
      if (hasBankDetails) {
        for (let i = 0; i < bankDetails.length; i++) {
          const bank = bankDetails[i];
          // If any field is filled, bankName is required
          if (bank.bankName || bank.branch || bank.accountNumber) {
            if (!bank.bankName.trim()) {
              toast({
                title: "Validation Error",
                description: `Bank Detail ${i + 1}: Bank name is required`,
                variant: "destructive",
              });
              return false;
            }
          }
        }
      }
    }

    // Validate documents if any are added
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc.document_name.trim()) {
        toast({
          title: "Validation Error",
          description: `Document name is required for document ${i + 1}`,
          variant: "destructive",
        });
        return false;
      }
      
      // For new documents, file is required
      if (!doc.file) {
        toast({
          title: "Validation Error",
          description: `File is required for document ${i + 1}`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID is missing. Cannot create customer.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    
    // Capture ALL current state values at the time of submission to avoid closure issues
    // Use ref for payment method to ensure we get the most up-to-date value
    const submissionData = {
      currentPaymentMethod: paymentMethodRef.current,
      currentCustomerType: customerType,
      currentName: name,
      currentPhone: phone,
      currentEmail: email,
      currentAddress: address,
      currentCity: city,
      currentState: state,
      currentCountry: country,
      currentPostalCode: postalCode,
      currentPreferredCommunication: preferredCommunication,
      currentNotes: notes,
      currentTags: tags,
      currentBusinessName: businessName,
      currentNatureOfBusiness: natureOfBusiness,
      currentPinNumber: pinNumber,
      currentContactPersonName: contactPersonName,
      currentContactPersonPhone: contactPersonPhone,
      currentContactPersonEmail: contactPersonEmail
    };
    


    try {
      // Convert tags string to array
      const tagsArray = submissionData.currentTags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag !== "");

      // Prepare customer data based on customer type
      let customerData: any = {
        name: submissionData.currentName.trim(),
        email: submissionData.currentEmail.trim() || null,
        phone: submissionData.currentPhone.trim() || null,
        status: status,
        address: submissionData.currentAddress.trim() || null,
        city: submissionData.currentCity.trim() || null,
        state: submissionData.currentState.trim() || null,
        country: submissionData.currentCountry.trim() || null,
        postal_code: submissionData.currentPostalCode.trim() || null,
        customer_type: submissionData.currentCustomerType || null,
        preferred_communication_channel: submissionData.currentPreferredCommunication || null,
        last_contact_date: null,
        notes: submissionData.currentNotes.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        payment_method: submissionData.currentPaymentMethod,
      };

      // Add company-specific fields if customer is a company
      if (submissionData.currentCustomerType === "company") {
        customerData = {
          ...customerData,
          business_name: submissionData.currentBusinessName.trim() || null,
          nature_of_business: submissionData.currentNatureOfBusiness.trim() || null,
          pin_number: submissionData.currentPinNumber.trim() || null,
          contact_person_name: submissionData.currentContactPersonName.trim() || null,
          contact_person_phone: submissionData.currentContactPersonPhone.trim() || null,
          contact_person_email: submissionData.currentContactPersonEmail.trim() || null,
        };
      }

      const newCustomer = await createCustomer(customerData);
      
      // Upload documents
      await uploadCustomerDocuments(newCustomer.id);

      // If payment method is credit, create customer account
      if (submissionData.currentPaymentMethod === "credit") {
        await createCustomerAccount(newCustomer.id);
      }

      toast({
        title: "Success!",
        description: "Customer created successfully",
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createCustomerAccount = async (customerId: string) => {
    try {
      // Transform the data to match the API interface
      const accountData = {
        customer_id: customerId,
        certificate_of_incorporation_number: certificateOfIncorporationNumber || null,
        company_type: companyType || null,
        annual_turnover: annualTurnover ? parseFloat(annualTurnover) : null,
        credit_required: creditRequired ? parseFloat(creditRequired) : null,
        credit_period_required: creditPeriodRequired || null,
        currently_defaulted: currentlyDefaulted,
        credit_terms: creditTerms || null,
        notes: null, // Add notes field as expected by API
        directors: directors
          .filter(d => d.name.trim() !== "")
          .map(d => ({
            name: d.name,
            id_passport_number: d.idPassportNumber, // Transform field name
            pin: d.pin || null,
            phone_number: d.phoneNumber || null, // Transform field name
          })),
        authorised_purchase_persons: authorisedPurchasePersons
          .filter(p => p.name.trim() !== "")
          .map(p => ({
            name: p.name,
            phone_number: p.phoneNumber || null, // Transform field name
          })),
        suppliers: suppliers
          .filter(s => s.name.trim() !== "")
          .map(s => ({
            name: s.name,
            contact_person_name: s.contactPersonName || null, // Transform field name
            phone_number: s.phoneNumber || null, // Transform field name
            credit_limit: s.creditLimit || null, // Transform field name
          })),
        bank_details: bankDetails
          .filter(b => b.bankName.trim() !== "")
          .map(b => ({
            bank_name: b.bankName, // Transform field name
            branch: b.branch || null,
            account_number: b.accountNumber || null, // Transform field name
          })),
      };
      
      // Import and call the actual createCustomerAccount function
      const { createCustomerAccount: apiCreateCustomerAccount } = await import("@/lib/customer-accounts");
      const result = await apiCreateCustomerAccount(accountData);
      
      toast({
        title: "Customer Account Created",
        description: `Credit account created successfully for customer. Account ID: ${result.id}`,
      });
      
      return result;
    } catch (error: any) {
      toast({
        title: "Account Creation Error",
        description: error.message || "Failed to create customer account",
        variant: "destructive",
      });
      
      throw new Error(`Failed to create customer account: ${error.message || "Unknown error"}`);
    }
  };

  const uploadCustomerDocuments = async (customerId: string) => {
    try {
      // Filter documents that have files (new documents)
      const newDocuments = documents.filter(doc => doc.file);
      
      // Upload each new document
      for (const doc of newDocuments) {
        if (doc.file) {
          if (!companyId) {
            throw new Error("Company ID is missing");
          }
          
          await uploadDocument({
            document_image: doc.file,
            documentable_type: "customer",
            documentable_id: customerId,
            company_id: companyId,
            document_name: doc.document_name,
            reference_number: doc.reference_number || undefined,
            expiry_date: doc.expiry_date || undefined,
            regulatory_body: doc.regulatory_body || undefined,
            other_information: doc.other_information || undefined,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Document Upload Error",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
      
      throw new Error(`Failed to upload documents: ${error.message || "Unknown error"}`);
    }
  };

  // Director management functions
  const addDirector = () => {
    setDirectors([...directors, { name: "", idPassportNumber: "", pin: "", phoneNumber: "" }]);
  };

  const removeDirector = (index: number) => {
    if (directors.length > 1) {
      setDirectors(directors.filter((_, i) => i !== index));
    }
  };

  const updateDirector = (index: number, field: string, value: string) => {
    const updatedDirectors = [...directors];
    (updatedDirectors[index] as any)[field] = value;
    setDirectors(updatedDirectors);
  };

  // Authorised purchase person management functions
  const addAuthorisedPurchasePerson = () => {
    setAuthorisedPurchasePersons([...authorisedPurchasePersons, { name: "", phoneNumber: "" }]);
  };

  const removeAuthorisedPurchasePerson = (index: number) => {
    if (authorisedPurchasePersons.length > 1) {
      setAuthorisedPurchasePersons(authorisedPurchasePersons.filter((_, i) => i !== index));
    }
  };

  const updateAuthorisedPurchasePerson = (index: number, field: string, value: string) => {
    const updatedPersons = [...authorisedPurchasePersons];
    (updatedPersons[index] as any)[field] = value;
    setAuthorisedPurchasePersons(updatedPersons);
  };

  // Supplier management functions
  const addSupplier = () => {
    setSuppliers([...suppliers, { name: "", contactPersonName: "", phoneNumber: "", creditLimit: "" }]);
  };

  const removeSupplier = (index: number) => {
    if (suppliers.length > 1) {
      setSuppliers(suppliers.filter((_, i) => i !== index));
    }
  };

  const updateSupplier = (index: number, field: string, value: string) => {
    const updatedSuppliers = [...suppliers];
    (updatedSuppliers[index] as any)[field] = value;
    setSuppliers(updatedSuppliers);
  };

  // Bank details management functions
  const addBankDetail = () => {
    setBankDetails([...bankDetails, { bankName: "", branch: "", accountNumber: "" }]);
  };

  const removeBankDetail = (index: number) => {
    if (bankDetails.length > 1) {
      setBankDetails(bankDetails.filter((_, i) => i !== index));
    }
  };

  const updateBankDetail = (index: number, field: string, value: string) => {
    const updatedBankDetails = [...bankDetails];
    (updatedBankDetails[index] as any)[field] = value;
    setBankDetails(updatedBankDetails);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col h-full">
        <SheetHeader className="border-b border-gray-200 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Add New Customer
          </SheetTitle>
          <SheetDescription>
            Fill in the details below to add a new customer to your system
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Customer Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Customer Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerType">Customer Type *</Label>
                <Select value={customerType} onValueChange={setCustomerType} disabled={isSubmitting || authLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={isSubmitting || authLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {customerType === "company" ? "Contact Person Name *" : "Customer Name *"}
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={customerType === "company" ? "Contact person name" : "John Doe"}
                    disabled={isSubmitting || authLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 123 456"
                    disabled={isSubmitting || authLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                    disabled={isSubmitting || authLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredCommunication">Preferred Communication</Label>
                  <Select value={preferredCommunication} onValueChange={setPreferredCommunication} disabled={isSubmitting || authLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preferred communication method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {customerType === "company" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Acme Corporation"
                      disabled={isSubmitting || authLoading}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="natureOfBusiness">Nature of Business</Label>
                      <Input
                        id="natureOfBusiness"
                        value={natureOfBusiness}
                        onChange={(e) => setNatureOfBusiness(e.target.value)}
                        placeholder="Retail, Manufacturing, etc."
                        disabled={isSubmitting || authLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pinNumber">PIN Number</Label>
                      <Input
                        id="pinNumber"
                        value={pinNumber}
                        onChange={(e) => setPinNumber(e.target.value)}
                        placeholder="P123456"
                        disabled={isSubmitting || authLoading}
                      />
                    </div>
                  </div>
                  
                </>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  disabled={isSubmitting || authLoading}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Nairobi"
                    disabled={isSubmitting || authLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Nairobi County"
                    disabled={isSubmitting || authLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Kenya"
                    disabled={isSubmitting || authLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="00100"
                  disabled={isSubmitting || authLoading}
                  className="w-full md:w-1/3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(value) => {
                    setPaymentMethod(value);
                    paymentMethodRef.current = value;
                  }} 
                  disabled={isSubmitting || authLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {paymentMethod === "credit" && (
                <div className="space-y-4 mt-4 p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium">Credit Account Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="creditRequired">Credit Required (KES)</Label>
                      <Input
                        id="creditRequired"
                        type="number"
                        value={creditRequired}
                        onChange={(e) => setCreditRequired(e.target.value)}
                        placeholder="50000"
                        disabled={isSubmitting || authLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="creditPeriodRequired">Credit Period Required</Label>
                      <Input
                        id="creditPeriodRequired"
                        value={creditPeriodRequired}
                        onChange={(e) => setCreditPeriodRequired(e.target.value)}
                        placeholder="30 days"
                        disabled={isSubmitting || authLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="certificateOfIncorporationNumber">Certificate of Incorporation Number</Label>
                      <Input
                        id="certificateOfIncorporationNumber"
                        value={certificateOfIncorporationNumber}
                        onChange={(e) => setCertificateOfIncorporationNumber(e.target.value)}
                        placeholder="C123456"
                        disabled={isSubmitting || authLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyType">Company Type</Label>
                      <Input
                        id="companyType"
                        value={companyType}
                        onChange={(e) => setCompanyType(e.target.value)}
                        placeholder="Limited, PLC, etc."
                        disabled={isSubmitting || authLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="annualTurnover">Annual Turnover (KES)</Label>
                    <Input
                      id="annualTurnover"
                      type="number"
                      value={annualTurnover}
                      onChange={(e) => setAnnualTurnover(e.target.value)}
                      placeholder="1000000"
                      disabled={isSubmitting || authLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="creditTerms">Credit Terms</Label>
                    <Input
                      id="creditTerms"
                      value={creditTerms}
                      onChange={(e) => setCreditTerms(e.target.value)}
                      placeholder="Net 30, etc."
                      disabled={isSubmitting || authLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentlyDefaulted}
                        onChange={(e) => setCurrentlyDefaulted(e.target.checked)}
                        disabled={isSubmitting || authLoading}
                        className="mr-2"
                      />
                      Currently Defaulted
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Directors Information (for credit accounts) */}
          {paymentMethod === "credit" && customerType === "company" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  Directors Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {directors.map((director, index) => (
                  <div key={index} className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Director {index + 1}</h3>
                      {directors.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDirector(index)}
                          disabled={isSubmitting || authLoading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={director.name}
                          onChange={(e) => updateDirector(index, "name", e.target.value)}
                          placeholder="Director name"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>ID/Passport Number *</Label>
                        <Input
                          value={director.idPassportNumber}
                          onChange={(e) => updateDirector(index, "idPassportNumber", e.target.value)}
                          placeholder="A1234567"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>PIN</Label>
                        <Input
                          value={director.pin}
                          onChange={(e) => updateDirector(index, "pin", e.target.value)}
                          placeholder="D123456"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={director.phoneNumber}
                          onChange={(e) => updateDirector(index, "phoneNumber", e.target.value)}
                          placeholder="0712345678"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDirector}
                  disabled={isSubmitting || authLoading}
                  className="w-full"
                >
                  Add Director
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Authorised Purchase Persons (for credit accounts) */}
          {paymentMethod === "credit" && customerType === "company" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Authorised Purchase Persons
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {authorisedPurchasePersons.map((person, index) => (
                  <div key={index} className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Authorised Person {index + 1}</h3>
                      {authorisedPurchasePersons.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAuthorisedPurchasePerson(index)}
                          disabled={isSubmitting || authLoading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={person.name}
                          onChange={(e) => updateAuthorisedPurchasePerson(index, "name", e.target.value)}
                          placeholder="Authorised person name"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={person.phoneNumber}
                          onChange={(e) => updateAuthorisedPurchasePerson(index, "phoneNumber", e.target.value)}
                          placeholder="0712345678"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAuthorisedPurchasePerson}
                  disabled={isSubmitting || authLoading}
                  className="w-full"
                >
                  Add Authorised Person
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Suppliers Information (for credit accounts) */}
          {paymentMethod === "credit" && customerType === "company" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  Current Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suppliers.map((supplier, index) => (
                  <div key={index} className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Supplier {index + 1}</h3>
                      {suppliers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSupplier(index)}
                          disabled={isSubmitting || authLoading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={supplier.name}
                          onChange={(e) => updateSupplier(index, "name", e.target.value)}
                          placeholder="Supplier name"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Contact Person Name</Label>
                        <Input
                          value={supplier.contactPersonName}
                          onChange={(e) => updateSupplier(index, "contactPersonName", e.target.value)}
                          placeholder="Contact person name"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={supplier.phoneNumber}
                          onChange={(e) => updateSupplier(index, "phoneNumber", e.target.value)}
                          placeholder="0712345678"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Credit Limit (KES)</Label>
                        <Input
                          type="number"
                          value={supplier.creditLimit}
                          onChange={(e) => updateSupplier(index, "creditLimit", e.target.value)}
                          placeholder="20000"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSupplier}
                  disabled={isSubmitting || authLoading}
                  className="w-full"
                >
                  Add Supplier
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Bank Details (for credit accounts) */}
          {paymentMethod === "credit" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600" />
                  Bank Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bankDetails.map((bank, index) => (
                  <div key={index} className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Bank Account {index + 1}</h3>
                      {bankDetails.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeBankDetail(index)}
                          disabled={isSubmitting || authLoading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Bank Name *</Label>
                        <Input
                          value={bank.bankName}
                          onChange={(e) => updateBankDetail(index, "bankName", e.target.value)}
                          placeholder="Bank of Africa"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input
                          value={bank.branch}
                          onChange={(e) => updateBankDetail(index, "branch", e.target.value)}
                          placeholder="Westlands"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={bank.accountNumber}
                          onChange={(e) => updateBankDetail(index, "accountNumber", e.target.value)}
                          placeholder="1234567890"
                          disabled={isSubmitting || authLoading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBankDetail}
                  disabled={isSubmitting || authLoading}
                  className="w-full"
                >
                  Add Bank Account
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <DocumentForm 
            documents={documents} 
            onChange={setDocuments} 
          />

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="VIP, Regular Customer, Wholesale"
                  disabled={isSubmitting || authLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this customer..."
                  disabled={isSubmitting || authLoading}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="border-t border-gray-200 pt-4">
          <div className="flex justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || authLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || authLoading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Customer
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
