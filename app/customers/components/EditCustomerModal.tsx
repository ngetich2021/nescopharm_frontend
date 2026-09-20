"use client";

import { useState, useEffect, useRef } from "react";
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
  Building, 
  FileText,
  Save,
  Loader2,
  CreditCard
} from "lucide-react";
import { DocumentForm, DocumentData } from "./DocumentForm";
import { type Customer, updateCustomer, getCustomerDisplayName } from "@/lib/customers";
import { getDocuments, uploadDocument } from "@/lib/documents";
import { getCustomerAccount, updateCustomerAccount, type CreateCustomerAccountPayload } from "@/lib/customer-accounts";

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export function EditCustomerModal({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: EditCustomerModalProps) {
  const { toast } = useToast();
  const { companyId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

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
  const [status, setStatus] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [preferredCommunication, setPreferredCommunication] = useState("");
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
  
  // Credit account fields
  const [creditRequired, setCreditRequired] = useState("");
  const [creditDays, setCreditDays] = useState("");
  const [certificateOfIncorporationNumber, setCertificateOfIncorporationNumber] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");
  const [currentlyDefaulted, setCurrentlyDefaulted] = useState(false);
  const [creditTerms, setCreditTerms] = useState("");
  const [directors, setDirectors] = useState([{ name: "", idPassportNumber: "", pin: "", phoneNumber: "" }]);
  const [authorisedPurchasePersons, setAuthorisedPurchasePersons] = useState([{ name: "", phoneNumber: "" }]);
  const [suppliers, setSuppliers] = useState([{ name: "", contactPersonName: "", phoneNumber: "", creditLimit: "" }]);
  const [bankDetails, setBankDetails] = useState([{ bankName: "", branch: "", accountNumber: "" }]);
  const [customerAccountId, setCustomerAccountId] = useState<string | null>(null);

  // Load customer data when modal opens
  useEffect(() => {
    if (open && customer) {
      setName(customer.name || "");
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setCompany(customer.company || "");
      setAddress(customer.address || "");
      setCity(customer.city || "");
      setState(customer.state || "");
      setCountry(customer.country || "");
      setPostalCode(customer.postal_code || "");
      setStatus(customer.status || "active");
      setCustomerType(customer.customer_type || "");
      setPreferredCommunication(customer.preferred_communication_channel || "");
      setNotes(() => {
        const notes = customer.notes as any;
        if (typeof notes === 'string') {
          return notes;
        } else if (Array.isArray(notes) && notes.length > 0) {
          // If notes is an array of objects, extract the note content
          return notes.map((note: any) => note.note_content || note).join('\n');
        } else {
          return "";
        }
      });
      
      // Handle tags - convert array to comma-separated string
      if (Array.isArray(customer.tags)) {
        setTags(customer.tags.join(", "));
      } else if (typeof customer.tags === "string") {
        setTags(customer.tags);
      } else {
        setTags("");
      }
      
      // Load company-specific fields
      setBusinessName(customer.business_name || "");
      setNatureOfBusiness(customer.nature_of_business || "");
      setPinNumber(customer.pin_number || "");
      setContactPersonName(customer.contact_person_name || "");
      setContactPersonPhone(customer.contact_person_phone || "");
      setContactPersonEmail(customer.contact_person_email || "");
      
      // Load payment method
      const method = customer.payment_method || "cash";
      setPaymentMethod(method);
      paymentMethodRef.current = method;
      
      // Load existing documents
      loadCustomerDocuments(customer.id);
      
      // Load customer account if payment method is credit
      if (method === "credit" && customer.account_id) {
        loadCustomerAccount(customer.account_id);
      } else {
        // Reset credit fields if not credit
        resetCreditFields();
      }
    } else {
      resetForm();
    }
  }, [open, customer]);

  const loadCustomerDocuments = async (customerId: string) => {
    try {
      const docs = await getDocuments("customer", customerId);
      // Convert to DocumentData format
      const formattedDocs = docs.map(doc => ({
        id: doc.id,
        document_name: doc.document_name,
        reference_number: doc.reference_number || undefined,
        expiry_date: doc.expiry_date || undefined,
        regulatory_body: doc.regulatory_body || undefined,
        other_information: doc.other_information || undefined,
        document_image: doc.document_image || undefined,
      }));
      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Failed to load customer documents:", error);
      setDocuments([]);
    }
  };

  const loadCustomerAccount = async (accountId: string) => {
    setIsLoadingAccount(true);
    try {
      const account = await getCustomerAccount(accountId);
      if (account) {
        setCustomerAccountId(account.id);
        setCreditRequired(account.credit_required?.toString() || "");
        setCreditDays(account.credit_days?.toString() || "");
        setCertificateOfIncorporationNumber(account.certificate_of_incorporation_number || "");
        setCompanyType(account.company_type || "");
        setAnnualTurnover(account.annual_turnover?.toString() || "");
        setCurrentlyDefaulted(account.currently_defaulted || false);
        setCreditTerms(account.credit_terms || "");
        
        // Load directors
        if (account.directors && account.directors.length > 0) {
          setDirectors(account.directors.map(d => ({
            name: d.name || "",
            idPassportNumber: d.id_passport_number || "",
            pin: d.pin || "",
            phoneNumber: d.phone_number || "",
          })));
        } else {
          setDirectors([{ name: "", idPassportNumber: "", pin: "", phoneNumber: "" }]);
        }
        
        // Load authorised purchase persons
        if (account.authorised_purchase_persons && account.authorised_purchase_persons.length > 0) {
          setAuthorisedPurchasePersons(account.authorised_purchase_persons.map(p => ({
            name: p.name || "",
            phoneNumber: p.phone_number || "",
          })));
        } else {
          setAuthorisedPurchasePersons([{ name: "", phoneNumber: "" }]);
        }
        
        // Load suppliers
        if (account.suppliers && account.suppliers.length > 0) {
          setSuppliers(account.suppliers.map(s => ({
            name: s.name || "",
            contactPersonName: s.contact_person_name || "",
            phoneNumber: s.phone_number || "",
            creditLimit: s.credit_limit || "",
          })));
        } else {
          setSuppliers([{ name: "", contactPersonName: "", phoneNumber: "", creditLimit: "" }]);
        }
        
        // Load bank details
        if (account.bank_details && account.bank_details.length > 0) {
          setBankDetails(account.bank_details.map(b => ({
            bankName: b.bank_name || "",
            branch: b.branch || "",
            accountNumber: b.account_number || "",
          })));
        } else {
          setBankDetails([{ bankName: "", branch: "", accountNumber: "" }]);
        }
      }
    } catch (error) {
      console.error("Failed to load customer account:", error);
      resetCreditFields();
    } finally {
      setIsLoadingAccount(false);
    }
  };

  const resetCreditFields = () => {
    setCustomerAccountId(null);
    setCreditRequired("");
    setCreditDays("");
    setCertificateOfIncorporationNumber("");
    setCompanyType("");
    setAnnualTurnover("");
    setCurrentlyDefaulted(false);
    setCreditTerms("");
    setDirectors([{ name: "", idPassportNumber: "", pin: "", phoneNumber: "" }]);
    setAuthorisedPurchasePersons([{ name: "", phoneNumber: "" }]);
    setSuppliers([{ name: "", contactPersonName: "", phoneNumber: "", creditLimit: "" }]);
    setBankDetails([{ bankName: "", branch: "", accountNumber: "" }]);
  };

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
    setStatus("active");
    setCustomerType("");
    setPreferredCommunication("");
    setNotes("");
    setTags("");
    setBusinessName("");
    setNatureOfBusiness("");
    setPinNumber("");
    setContactPersonName("");
    setContactPersonPhone("");
    setContactPersonEmail("");
    setPaymentMethod("cash");
    paymentMethodRef.current = "cash";
    setDocuments([]);
    resetCreditFields();
  };

  const validateForm = () => {
    // Only name is required when updating a customer
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
          description: `Document ${i + 1} name is required`,
          variant: "destructive",
        });
        return false;
      }
      
      // For new documents, file is required
      if (!doc.id && !doc.file) {
        toast({
          title: "Validation Error",
          description: `Document ${i + 1} file is required`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!customer || !validateForm()) return;

    setIsSubmitting(true);
    
    // Capture ALL current state values at the time of submission
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
      let updateData: any = {
        name: submissionData.currentName.trim(),
        email: submissionData.currentEmail.trim() || null,
        phone: submissionData.currentPhone.trim() || null,
        address: submissionData.currentAddress.trim() || null,
        city: submissionData.currentCity.trim() || null,
        state: submissionData.currentState.trim() || null,
        country: submissionData.currentCountry.trim() || null,
        postal_code: submissionData.currentPostalCode.trim() || null,
        status: status as "active" | "inactive" | "pending",
        customer_type: (submissionData.currentCustomerType as "individual" | "company") || null,
        preferred_communication_channel: submissionData.currentPreferredCommunication || null,
        notes: submissionData.currentNotes.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        payment_method: submissionData.currentPaymentMethod,
      };

      // Add company-specific fields if customer is a company
      if (submissionData.currentCustomerType === "company") {
        updateData = {
          ...updateData,
          business_name: submissionData.currentBusinessName.trim() || null,
          nature_of_business: submissionData.currentNatureOfBusiness.trim() || null,
          pin_number: submissionData.currentPinNumber.trim() || null,
          contact_person_name: submissionData.currentContactPersonName.trim() || null,
          contact_person_phone: submissionData.currentContactPersonPhone.trim() || null,
          contact_person_email: submissionData.currentContactPersonEmail.trim() || null,
        };
      }

      await updateCustomer(customer.id, updateData);
      
      // Upload new documents
      await uploadCustomerDocuments(customer.id);

      // If payment method is credit, update or create customer account
      if (submissionData.currentPaymentMethod === "credit") {
        if (customerAccountId) {
          await updateCustomerAccountData(customerAccountId);
        } else {
          await createCustomerAccountData(customer.id);
        }
      }

      toast({
        title: "Success!",
        description: "Customer updated successfully",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createCustomerAccountData = async (customerId: string) => {
    try {
      const accountData = {
        customer_id: customerId,
        certificate_of_incorporation_number: certificateOfIncorporationNumber || null,
        company_type: companyType || null,
        annual_turnover: annualTurnover ? parseFloat(annualTurnover) : null,
        credit_required: creditRequired ? parseFloat(creditRequired) : null,
        credit_days: creditDays ? parseInt(creditDays, 10) : null,
        currently_defaulted: currentlyDefaulted,
        credit_terms: creditTerms || null,
        notes: null,
        directors: directors
          .filter(d => d.name.trim() !== "")
          .map(d => ({
            name: d.name,
            id_passport_number: d.idPassportNumber,
            pin: d.pin || null,
            phone_number: d.phoneNumber || null,
          })),
        authorised_purchase_persons: authorisedPurchasePersons
          .filter(p => p.name.trim() !== "")
          .map(p => ({
            name: p.name,
            phone_number: p.phoneNumber || null,
          })),
        suppliers: suppliers
          .filter(s => s.name.trim() !== "")
          .map(s => ({
            name: s.name,
            contact_person_name: s.contactPersonName || null,
            phone_number: s.phoneNumber || null,
            credit_limit: s.creditLimit || null,
          })),
        bank_details: bankDetails
          .filter(b => b.bankName.trim() !== "")
          .map(b => ({
            bank_name: b.bankName,
            branch: b.branch || null,
            account_number: b.accountNumber || null,
          })),
      };
      
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

  const updateCustomerAccountData = async (accountId: string) => {
    try {
      const accountData = {
        certificate_of_incorporation_number: certificateOfIncorporationNumber || null,
        company_type: companyType || null,
        annual_turnover: annualTurnover ? parseFloat(annualTurnover) : null,
        credit_required: creditRequired ? parseFloat(creditRequired) : null,
        credit_days: creditDays ? parseInt(creditDays, 10) : null,
        currently_defaulted: currentlyDefaulted,
        credit_terms: creditTerms || null,
        notes: null,
        directors: directors
          .filter(d => d.name.trim() !== "")
          .map(d => ({
            name: d.name,
            id_passport_number: d.idPassportNumber,
            pin: d.pin || null,
            phone_number: d.phoneNumber || null,
          })),
        authorised_purchase_persons: authorisedPurchasePersons
          .filter(p => p.name.trim() !== "")
          .map(p => ({
            name: p.name,
            phone_number: p.phoneNumber || null,
          })),
        suppliers: suppliers
          .filter(s => s.name.trim() !== "")
          .map(s => ({
            name: s.name,
            contact_person_name: s.contactPersonName || null,
            phone_number: s.phoneNumber || null,
            credit_limit: s.creditLimit || null,
          })),
        bank_details: bankDetails
          .filter(b => b.bankName.trim() !== "")
          .map(b => ({
            bank_name: b.bankName,
            branch: b.branch || null,
            account_number: b.accountNumber || null,
          })),
      };
      
      await updateCustomerAccount(accountId, accountData);
      
      toast({
        title: "Customer Account Updated",
        description: "Credit account updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Account Update Error",
        description: error.message || "Failed to update customer account",
        variant: "destructive",
      });
      
      throw new Error(`Failed to update customer account: ${error.message || "Unknown error"}`);
    }
  };

  const uploadCustomerDocuments = async (customerId: string) => {
    try {
      // Filter documents that have files (new documents)
      const newDocuments = documents.filter(doc => doc.file && !doc.id);
      
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
  
  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col h-full">
        <SheetHeader className="border-b border-gray-200 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Edit Customer
          </SheetTitle>
          <SheetDescription>
            Update customer information and details for {getCustomerDisplayName(customer)}
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
                <Select value={customerType || undefined} onValueChange={setCustomerType} disabled={isSubmitting || isLoadingAccount}>
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
                <Select value={status} onValueChange={setStatus} disabled={isSubmitting || isLoadingAccount}>
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
                    disabled={isSubmitting || isLoadingAccount}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 123 456"
                    disabled={isSubmitting || isLoadingAccount}
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
                    disabled={isSubmitting || isLoadingAccount}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredCommunication">Preferred Communication</Label>
                  <Select value={preferredCommunication || undefined} onValueChange={setPreferredCommunication} disabled={isSubmitting || isLoadingAccount}>
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
                      disabled={isSubmitting || isLoadingAccount}
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
                        disabled={isSubmitting || isLoadingAccount}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pinNumber">PIN Number</Label>
                      <Input
                        id="pinNumber"
                        value={pinNumber}
                        onChange={(e) => setPinNumber(e.target.value)}
                        placeholder="P123456"
                        disabled={isSubmitting || isLoadingAccount}
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
                  disabled={isSubmitting || isLoadingAccount}
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
                    disabled={isSubmitting || isLoadingAccount}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Nairobi County"
                    disabled={isSubmitting || isLoadingAccount}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Kenya"
                    disabled={isSubmitting || isLoadingAccount}
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
                  disabled={isSubmitting || isLoadingAccount}
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
                  disabled={isSubmitting || isLoadingAccount}
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
                  
                  {isLoadingAccount && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2">Loading account details...</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="creditRequired">Credit Required (KES)</Label>
                      <Input
                        id="creditRequired"
                        type="number"
                        value={creditRequired}
                        onChange={(e) => setCreditRequired(e.target.value)}
                        placeholder="50000"
                        disabled={isSubmitting || isLoadingAccount}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="creditDays">Credit Period (Days)</Label>
                      <Input
                        id="creditDays"
                        type="number"
                        min="0"
                        value={creditDays}
                        onChange={(e) => setCreditDays(e.target.value)}
                        placeholder="e.g. 60"
                        disabled={isSubmitting || isLoadingAccount}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used to auto-calculate invoice due dates for this customer.
                      </p>
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
                        disabled={isSubmitting || isLoadingAccount}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyType">Company Type</Label>
                      <Input
                        id="companyType"
                        value={companyType}
                        onChange={(e) => setCompanyType(e.target.value)}
                        placeholder="Limited, PLC, etc."
                        disabled={isSubmitting || isLoadingAccount}
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
                      disabled={isSubmitting || isLoadingAccount}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="creditTerms">Credit Terms</Label>
                    <Input
                      id="creditTerms"
                      value={creditTerms}
                      onChange={(e) => setCreditTerms(e.target.value)}
                      placeholder="Net 30, etc."
                      disabled={isSubmitting || isLoadingAccount}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentlyDefaulted}
                        onChange={(e) => setCurrentlyDefaulted(e.target.checked)}
                        disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>ID/Passport Number *</Label>
                        <Input
                          value={director.idPassportNumber}
                          onChange={(e) => updateDirector(index, "idPassportNumber", e.target.value)}
                          placeholder="A1234567"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>PIN</Label>
                        <Input
                          value={director.pin}
                          onChange={(e) => updateDirector(index, "pin", e.target.value)}
                          placeholder="D123456"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={director.phoneNumber}
                          onChange={(e) => updateDirector(index, "phoneNumber", e.target.value)}
                          placeholder="0712345678"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDirector}
                  disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={person.phoneNumber}
                          onChange={(e) => updateAuthorisedPurchasePerson(index, "phoneNumber", e.target.value)}
                          placeholder="0712345678"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAuthorisedPurchasePerson}
                  disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Contact Person Name</Label>
                        <Input
                          value={supplier.contactPersonName}
                          onChange={(e) => updateSupplier(index, "contactPersonName", e.target.value)}
                          placeholder="Contact person name"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={supplier.phoneNumber}
                          onChange={(e) => updateSupplier(index, "phoneNumber", e.target.value)}
                          placeholder="0712345678"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Credit Limit (KES)</Label>
                        <Input
                          type="number"
                          value={supplier.creditLimit}
                          onChange={(e) => updateSupplier(index, "creditLimit", e.target.value)}
                          placeholder="20000"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSupplier}
                  disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
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
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input
                          value={bank.branch}
                          onChange={(e) => updateBankDetail(index, "branch", e.target.value)}
                          placeholder="Westlands"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={bank.accountNumber}
                          onChange={(e) => updateBankDetail(index, "accountNumber", e.target.value)}
                          placeholder="1234567890"
                          disabled={isSubmitting || isLoadingAccount}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBankDetail}
                  disabled={isSubmitting || isLoadingAccount}
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
                  disabled={isSubmitting || isLoadingAccount}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this customer..."
                  disabled={isSubmitting || isLoadingAccount}
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
              disabled={isSubmitting || isLoadingAccount}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingAccount}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Customer
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
