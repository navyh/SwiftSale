# SwiftSale

SwiftSale is a comprehensive business management platform designed to streamline product management, order processing, procurement tracking, and user management for businesses of all sizes.

## Overview

SwiftSale provides an intuitive interface for managing your business operations, with a focus on:

- **Product Management**: Create and manage products with variants, pricing, and inventory
- **Order Management**: Process orders with customer selection, GST calculation, and payment tracking
- **Procurement Tracking**: Manage vendor relationships and track procurement processes
- **User and Profile Management**: Handle user accounts, business profiles, and staff roles
- **Settings Configuration**: Configure system settings for brands, categories, sizes, units, and colors

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **UI Components**: Tailwind CSS, shadcn/ui
- **State Management**: React Hooks and Context API
- **API Integration**: Custom API client with fetch
- **Authentication**: Token-based authentication (implementation details in apiClient.ts)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/SwiftSale.git
   cd SwiftSale
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-api-url.com/api/v2
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
SwiftSale/
├── docs/                  # Documentation files
├── public/                # Static assets
├── src/                   # Source code
│   ├── ai/                # AI integration components
│   ├── app/               # Next.js App Router pages
│   │   ├── products/      # Product management pages
│   │   ├── orders/        # Order management pages
│   │   ├── procurements/  # Procurement management pages
│   │   ├── users/         # User management pages
│   │   ├── settings/      # Settings pages
│   │   └── ...
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # Base UI components
│   │   └── layout/        # Layout components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions and API client
│   └── ...
├── .env.local             # Environment variables (create this file)
├── next.config.ts         # Next.js configuration
├── package.json           # Project dependencies
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Documentation

For detailed documentation, please refer to the [docs](./docs) directory:

- [Getting Started Guide](./docs/getting-started.md)
- [Architecture Overview](./docs/architecture.md)
- [API Integration](./docs/api-integration.md)
- [Business Logic](./docs/business-logic.md)
- [Component Structure](./docs/component-structure.md)
- [Development Workflow](./docs/development-workflow.md)

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
