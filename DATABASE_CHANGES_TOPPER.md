# Database Changes for Cake Topper Feature

## Summary
This document describes the database changes needed to support the cake topper feature in orders. When an order requires a cake topper (`needs_cake_topper = true`), users can provide details and reference photos.

## Database Changes

### 1. Update `orders` table

Add two new columns to the existing `orders` table:

```sql
-- Add topper details and photos columns to orders table
ALTER TABLE orders
ADD COLUMN topper_details TEXT,
ADD COLUMN topper_photos JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN orders.topper_details IS 'Details and specifications for the cake topper (nullable)';
COMMENT ON COLUMN orders.topper_photos IS 'Array of photo URLs for topper references (nullable)';
```

## API Updates

### Orders API Changes

#### GET /api/orders
**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "quotation_id": "uuid",
      "client_name": "string",
      "phone_number": "string",
      "order_details": "string",
      "delivery_date": "timestamp",
      "client_photos": ["url1", "url2"],
      "needs_cake_topper": true,
      "topper_details": "Custom topper with name 'Maria' in gold color",
      "topper_photos": ["url1", "url2", "url3"],
      "cost_amount": 25000,
      "charge_amount": 35000,
      "payment_method_id": "uuid",
      "down_payment": 10000,
      "supplies_needed": "string",
      "statuses": ["waiting_for_payment"],
      "created_at": "timestamp"
    }
  ]
}
```

#### GET /api/orders/:id
**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "quotation_id": "uuid",
    "client_name": "string",
    "phone_number": "string",
    "order_details": "string",
    "delivery_date": "timestamp",
    "client_photos": ["url1", "url2"],
    "needs_cake_topper": true,
    "topper_details": "Custom topper with name 'Maria' in gold color",
    "topper_photos": ["url1", "url2", "url3"],
    "cost_amount": 25000,
    "charge_amount": 35000,
    "payment_method_id": "uuid",
    "down_payment": 10000,
    "supplies_needed": "string",
    "statuses": ["waiting_for_payment"],
    "created_at": "timestamp"
  }
}
```

#### POST /api/orders
**Request Body**:
```json
{
  "quotation_id": "uuid",
  "client_name": "María González",
  "phone_number": "+506 8888 8888",
  "order_details": "Pastel de chocolate para cumpleaños",
  "delivery_date": "2024-03-20T15:00:00Z",
  "client_photos": ["base64_string_1", "base64_string_2"],
  "needs_cake_topper": true,
  "topper_details": "Custom topper with name 'Maria' in gold color with glitter finish",
  "topper_photos": ["base64_string_1", "base64_string_2"],
  "cost_amount": 25000,
  "charge_amount": 35000,
  "payment_method_id": "uuid",
  "down_payment": 10000,
  "supplies_needed": "Velas de cumpleaños"
}
```

**Response** (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "quotation_id": "uuid",
    "client_name": "María González",
    "phone_number": "+506 8888 8888",
    "order_details": "Pastel de chocolate para cumpleaños",
    "delivery_date": "2024-03-20T15:00:00Z",
    "client_photos": ["url1", "url2"],
    "needs_cake_topper": true,
    "topper_details": "Custom topper with name 'Maria' in gold color with glitter finish",
    "topper_photos": ["url1", "url2"],
    "cost_amount": 25000,
    "charge_amount": 35000,
    "payment_method_id": "uuid",
    "down_payment": 10000,
    "supplies_needed": "Velas de cumpleaños",
    "statuses": ["waiting_for_payment"],
    "created_at": "timestamp"
  }
}
```

#### PUT /api/orders/:id
**Request Body**: Same as POST, all fields optional
**Response** (200 OK): Same as POST response

#### PATCH /api/orders/:id/topper
Special endpoint to update only topper information for an existing order.

**Request Body**:
```json
{
  "topper_details": "Updated topper details",
  "topper_photos": ["base64_string_1", "base64_string_2"]
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "topper_details": "Updated topper details",
    "topper_photos": ["url1", "url2"],
    "updated_at": "timestamp"
  }
}
```

## TypeScript Type Updates

### src/types/order.ts

```typescript
export interface Order {
  id: string;
  quotationId?: string;
  quotation?: {
    id: string;
    clientName: string;
    size: string;
    servings: number;
    totalCost: number;
    createdAt: string;
  };
  clientName: string;
  phoneNumber: string;
  orderDetails: string;
  deliveryDate: Date;
  clientPhotos: (string | ClientPhoto)[];
  needsCakeTopper: boolean;
  topperDetails?: string;        // NEW
  topperPhotos?: string[];       // NEW
  costAmount: number;
  chargeAmount: number;
  paymentMethod: PaymentMethod;
  downPayment: number;
  suppliesNeeded: string;
  statuses: (OrderStatus | OrderStatusObject)[];
  createdAt: string;
}
```

## Implementation Notes

### Backend Logic

1. **Creating/Updating Orders**:
   - If `needs_cake_topper` is `false`, `topper_details` and `topper_photos` should be set to `NULL`
   - If `needs_cake_topper` is `true`, `topper_details` and `topper_photos` are optional but can be provided
   - `topper_photos` should be stored as a JSONB array of URLs

2. **Photo Handling**:
   - When base64 photos are provided in `topper_photos`, convert them to files and upload to storage
   - Store the resulting URLs in the `topper_photos` JSONB array
   - Support adding/removing individual photos through the PATCH endpoint

3. **Data Validation**:
   - `topper_details`: Optional text field, max 1000 characters
   - `topper_photos`: Optional array, max 10 photos

### Frontend Updates Required

1. **TopperUploadDialog Component**:
   - Connect to API to save/update topper information
   - Pass order ID as prop
   - Call PATCH `/api/orders/:id/topper` endpoint
   - Display existing topper data when editing

2. **OrderForm Component**:
   - Include `topperDetails` and `topperPhotos` in form state
   - Submit topper data when creating/updating orders

3. **Order Display Components**:
   - Show topper details and photos when `needsCakeTopper` is true
   - Allow editing topper information after order creation
