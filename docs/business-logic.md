# Business Logic

This document outlines the core business rules and domain logic implemented in the SwiftSale application.

## Product Management

### Product Structure

Products in SwiftSale follow a hierarchical structure:

1. **Product**: The base entity representing a product type
2. **Variants**: Specific variations of a product (e.g., different colors, sizes)

### Product Attributes

Products have the following key attributes:

- **Basic Information**: Name, description, brand, category, subcategory
- **Taxation**: HSN code, GST tax rate
- **Status**: Active, Draft, Archived, Out of Stock
- **Metadata**: Tags, manufactured by, title

### Variant Attributes

Variants have the following key attributes:

- **Identification**: SKU, barcode
- **Characteristics**: Color, size, capacity, dimensions, weight
- **Pricing**: MRP, selling price, cost price
- **Inventory**: Quantity
- **Status**: Active, Draft, Archived, Out of Stock

### Product Creation Flow

1. Create base product with basic information
2. Add variants with specific attributes
3. Set pricing and inventory for each variant
4. Activate the product when ready for sale

### Quick Product Creation

For rapid product entry, SwiftSale provides a quick creation flow:

1. Enter basic product details (name, brand, category)
2. Specify color and size variants as comma-separated values
3. Set a single unit price
4. System automatically creates the product with all specified variants

## Order Management

### Order Structure

Orders in SwiftSale consist of:

1. **Customer Information**: User details, business profile (for B2B)
2. **Order Items**: Products, variants, quantities, pricing
3. **Pricing Information**: Subtotals, discounts, taxes, grand total
4. **Addresses**: Billing and shipping addresses
5. **Payment Details**: Payment method, status
6. **Order Status**: Pending, Processing, Completed, etc.

### Order Types

SwiftSale supports two primary order types:

1. **B2C (Business to Consumer)**: Orders placed for individual customers
2. **B2B (Business to Business)**: Orders placed for business entities with GST information

### Order Creation Flow

1. **Customer Selection**: Search and select customer or create new
2. **Product Selection**: Search and add products with quantities
3. **Pricing Adjustment**: Modify prices, discounts, and taxes if needed
4. **Review & Payment**: Confirm order details and select payment method
5. **Submission**: Create the order in the system

## GST Calculation

### GST Structure

SwiftSale implements Indian Goods and Services Tax (GST) calculations:

1. **IGST (Integrated GST)**: Applied for inter-state transactions
2. **CGST (Central GST) & SGST (State GST)**: Applied for intra-state transactions

### State Code Logic

GST calculation depends on the customer's state code:

- If customer state code === seller state code (default "04"): Apply CGST & SGST
- If customer state code !== seller state code: Apply IGST

### Price Derivation and GST Calculation

#### Unit Price Derivation

In SwiftSale, the pricing model follows these principles:

1. **MRP (Maximum Retail Price)**: This is the GST-inclusive maximum price that can be charged to the customer. It's the starting point for pricing calculations.

2. **Selling Price**: This is the actual GST-inclusive price charged to the customer after applying discounts.

3. **Unit Price**: This is the pre-tax, pre-discount price used for internal calculations and API payloads.

The system derives the Unit Price as follows:

```javascript
// When a POS user inputs an MRP (GST-inclusive)
const inclusiveMrp = mrpInputByUser;

// Back-calculate the pre-tax MRP
const preTaxMrp = gstRate > 0 ? inclusiveMrp / (1 + (gstRate / 100)) : inclusiveMrp;

// When a discount is applied (either as a percentage or by directly setting a selling price)
const discountRate = discountRateInputByUser; // e.g., 10%
const preTaxSellingPrice = preTaxMrp * (1 - (discountRate / 100));

// Calculate the GST-inclusive selling price (what customer pays)
const inclusiveSellingPrice = preTaxSellingPrice * (1 + (gstRate / 100));

// The Unit Price used in calculations is the pre-tax selling price
const unitPrice = preTaxSellingPrice;
```

Alternatively, if the user directly inputs a selling price:

```javascript
// When a POS user inputs a selling price (GST-inclusive)
const inclusiveSellingPrice = sellingPriceInputByUser;

// Back-calculate the pre-tax selling price (Unit Price)
const preTaxSellingPrice = gstRate > 0 ? inclusiveSellingPrice / (1 + (gstRate / 100)) : inclusiveSellingPrice;
const unitPrice = preTaxSellingPrice;

// If MRP is known, calculate the effective discount rate
if (preTaxMrp > 0 && preTaxSellingPrice <= preTaxMrp) {
  const discountAmount = preTaxMrp - preTaxSellingPrice;
  const discountRate = (discountAmount / preTaxMrp) * 100;
}
```

#### Tax Calculation Logic

For each order item, once the Unit Price is derived:

```javascript
// Calculate pre-tax MRP from the GST-inclusive MRP
const preTaxMrp = gstTaxRate > 0 ? inclusiveMrp / (1 + (gstTaxRate / 100)) : inclusiveMrp;

// Calculate discount amount as the difference between pre-tax MRP and pre-tax unit price, multiplied by quantity
const discountAmount = (preTaxMrp - unitPrice) * quantity;

// Calculate taxable amount (pre-tax)
const taxableAmount = unitPrice * quantity;

// Calculate GST amount
const gstAmount = (taxableAmount * gstTaxRate) / 100;

// Determine GST breakdown based on customer state
if (customerStateCode !== SELLER_STATE_CODE) {
  // Inter-state: Use IGST
  iGstRate = gstTaxRate;
  iGstAmount = gstAmount;
} else {
  // Intra-state: Split into CGST and SGST
  cGstRate = gstTaxRate / 2;
  sGstRate = gstTaxRate / 2;
  cGstAmount = gstAmount / 2;
  sGstAmount = gstAmount / 2;
}

// Calculate total amount (what customer pays)
const totalAmount = taxableAmount + gstAmount;
```

This approach ensures that:
1. The selling price entered by the user is exactly what the customer pays
2. GST is correctly back-calculated from the selling price
3. Discounts are properly applied to the pre-tax amount
4. GST is calculated on the post-discount taxable amount
5. GST is correctly split between IGST vs CGST/SGST based on customer state

### Order Totals Calculation

Order totals are calculated as:

1. **Subtotal (Pre-tax, Pre-discount)**: Sum of (unitPrice * quantity) for all items
2. **Total Discount**: Sum of discountAmount for all items
3. **Total Taxable Amount**: Sum of taxableAmount for all items
4. **Total GST**: Sum of gstAmount for all items
5. **Grand Total**: Sum of totalAmount for all items

## User and Profile Management

### User Types

SwiftSale supports different user types:

1. **Customers**: End users who place orders
2. **Staff**: Users with system access (Admin, Manager, POS User, Sales Person)

### Business Profiles

Business profiles represent B2B customers with:

- Company name
- GSTIN (GST Identification Number)
- Business addresses
- Payment terms
- Credit limit
- Associated users

### User-Business Relationship

- A user can be associated with multiple business profiles
- A business profile can have multiple associated users
- Each user-business relationship has a role (Owner, Manager, Staff)

### Address Management

Addresses are managed for both users and business profiles:

- Multiple addresses per user/business
- Address types: Billing, Shipping
- Default address designation
- State code for GST calculation

## Procurement Management

### Procurement Structure

Procurements represent inventory purchases from vendors:

1. **Vendor Information**: Supplier details
2. **Procurement Items**: Products, variants, quantities, costs
3. **Pricing Information**: Subtotals, taxes, grand total
4. **Payment Details**: Payment method, status
5. **Procurement Status**: Pending, Received, Completed, etc.

### Procurement Flow

1. Select vendor
2. Add products with quantities and costs
3. Review procurement details
4. Submit procurement
5. Receive inventory and update stock

## Settings Configuration

### Configurable Entities

SwiftSale allows configuration of various entities:

1. **Brands**: Product manufacturers or brands
2. **Categories**: Product categorization hierarchy
3. **Units**: Measurement units for products
4. **Colors**: Standard color options for variants
5. **Sizes**: Standard size options for variants

### Metadata Management

Each metadata entity supports:

- Creation of new entries
- Updating existing entries
- Deletion of unused entries
- Hierarchical relationships (for categories)

## Business Rules and Validations

### Product Rules

- Products must have at least one variant
- Product names must be unique
- GST rates must be one of the standard rates (0%, 5%, 12%, 18%, 28%)

### Order Rules

- Orders must have at least one item
- Orders must have a customer assigned
- B2B orders must have a valid GSTIN
- Billing address is required for all orders

### User Rules

- Users must have a unique phone number
- Email addresses must be valid if provided
- Business profiles must have a valid GSTIN
- Staff users must have at least one role assigned
