# 🤖 Agentic AI HR - AI Coding Agent Guide

This document is designed for AI coding agents working on the Agentic AI HR project. It contains essential information about the project structure, development practices, and key architectural decisions.

## 🎯 Project Overview

**Agentic AI HR** is a comprehensive Next.js 14-based admin dashboard application for managing HR operations, AI agents, users, subscriptions, and business analytics. The application features a complete authentication system with separate user and admin flows, integrated with a FastAPI backend.

### Key Features
- 🔐 Complete JWT-based authentication (user & admin)
- 👥 User and Agent management
- 📊 Analytics dashboard with charts and maps
- 💳 Subscription and billing management
- 🎫 Coupon management system
- 📞 Call records tracking
- 📚 Knowledge base management
- 📄 Document management
- 🎨 Bootstrap 5 based responsive UI

## 🛠 Technology Stack

### Core Technologies
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Bootstrap 5** - CSS framework
- **React Bootstrap** - Bootstrap components for React
- **Sass/SCSS** - CSS preprocessor

### Key Libraries
- **React Hook Form + Yup** - Form handling and validation
- **React Context API** - Global state management
- **React Toastify** - Notifications
- **ApexCharts** - Data visualization
- **FullCalendar** - Calendar functionality
- **GridJS** - Data tables
- **React Quill** - Rich text editor
- **React Dropzone** - File uploads

## 📁 Project Structure

```
admin/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (admin)/                # Protected admin routes
│   │   │   ├── layout.tsx          # Admin layout with AuthGuard
│   │   │   ├── dashboards/         # Main dashboard
│   │   │   ├── agents/             # Agent management
│   │   │   ├── user-management/    # User management
│   │   │   ├── subscription-plans/ # Subscription management
│   │   │   ├── coupons/            # Coupon management
│   │   │   ├── call-records/       # Call records
│   │   │   ├── documents/          # Document management
│   │   │   └── create-agent/       # Create agent
│   │   │
│   │   └── (other)/                # Public routes
│   │       ├── auth/               # Authentication pages
│   │       │   ├── sign-in/        # User sign in
│   │       │   ├── sign-up/        # User sign up
│   │       │   └── admin/          # Admin auth pages
│   │       └── error-pages/        # Error pages
│   │
│   ├── components/                 # Reusable components
│   │   ├── layout/                 # Layout components
│   │   ├── from/                   # Form input components
│   │   ├── table/                  # Table components
│   │   └── wrapper/                # Wrapper components
│   │
│   ├── context/                    # React Context providers
│   │   ├── useAuthContext.tsx      # Authentication state
│   │   ├── useLayoutContext.tsx    # Layout state
│   │   └── ...                     # Other contexts
│   │
│   ├── lib/                        # Core libraries
│   │   ├── api-client.ts           # HTTP client
│   │   ├── auth-api.ts             # Auth endpoints
│   │   ├── auth-storage.ts         # Token storage
│   │   ├── auth-guard.tsx          # Route protection
│   │   └── *-api.ts                # Feature-specific APIs
│   │
│   ├── types/                      # TypeScript types
│   ├── hooks/                      # Custom React hooks
│   ├── utils/                      # Utility functions
│   └── assets/                     # Static assets
│
├── public/                         # Static files
├── .env.local                      # Environment variables
└── Documentation/                  # Project documentation
```

## 🔐 Authentication System

### Architecture
The authentication system uses JWT tokens with separate flows for users and admins:

- **User Routes**: `/auth/sign-in`, `/auth/sign-up` → `POST /auth/user/*`
- **Admin Routes**: `/auth/admin/sign-in`, `/auth/admin/sign-up` → `POST /auth/admin/*`

### Key Components
- **Auth Context** (`useAuthContext.tsx`) - Global authentication state
- **Auth Guard** (`auth-guard.tsx`) - Route protection
- **API Client** (`api-client.ts`) - HTTP client with token handling
- **Storage** (`auth-storage.ts`) - Secure localStorage management

### Authentication Flow
1. User submits credentials via form
2. Frontend validation (React Hook Form + Yup)
3. API call to backend with proper endpoint
4. JWT token and user data returned
5. Token saved to localStorage with expiry tracking
6. Auth context updated globally
7. Auto-redirect to dashboard
8. Protected routes verified by AuthGuard

## 🔄 Development Workflow

### Getting Started
```bash
# Install dependencies
pnpm install

# Create environment file
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local

# Start development server
pnpm dev
```

### Build Commands
```bash
pnpm dev      # Development server (localhost:3000)
pnpm build    # Production build
pnpm start    # Production server
pnpm lint     # ESLint
pnpm format   # Prettier formatting
```

### Creating New Features
1. **New Page**: Create in `app/(admin)/` for protected or `app/(other)/` for public
2. **New Component**: Add to `components/` with proper TypeScript interfaces
3. **New API**: Create in `lib/` following existing patterns
4. **New Types**: Add to `types/` directory

## 🎨 UI/UX Patterns

### Form Handling Pattern
```typescript
'use client'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required()
})

export default function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data) => {
    // Handle submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">Submit</button>
    </form>
  )
}
```

### API Integration Pattern
```typescript
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/context/useAuthContext'
import { toast } from 'react-toastify'

const { token } = useAuth()

const response = await apiClient.get('/endpoint', token)

if (response.error) {
  toast.error(response.error)
  return
}

// Use response.data
```

### Protected Component Pattern
```typescript
'use client'
import { useAuth } from '@/context/useAuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedComponent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/sign-in')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return null

  return <div>Protected Content</div>
}
```

## 📋 Code Standards

### TypeScript Usage
- Always define interfaces for component props
- Use proper TypeScript types (avoid `any`)
- Leverage path aliases (`@/` for `src/`)

### Component Structure
- Use `'use client'` for interactive components
- Keep components focused and single-purpose
- Use proper TypeScript interfaces
- Implement proper error handling

### Naming Conventions
- Components: PascalCase (e.g., `UserManagement.tsx`)
- Functions: camelCase (e.g., `getUserData()`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)
- Files: Kebab-case for utilities (e.g., `auth-storage.ts`)

### Error Handling
- Always handle API errors with user-friendly messages
- Use try-catch blocks for async operations
- Display appropriate toast notifications
- Implement loading states

## 🔧 Key Utilities

### Path Aliases
```typescript
// Use @/ instead of relative paths
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/context/useAuthContext'
import { User } from '@/types/user'
```

### Common Hooks
- `useAuth()` - Authentication state and methods
- `useLayout()` - Layout state (sidebar, theme)
- `useLocalStorage()` - Persistent local storage
- `useToggle()` - Boolean state toggling

### API Response Format
```typescript
interface ApiResponse<T> {
  data?: T        // Success data
  error?: string  // Error message
  status: number  // HTTP status code
}
```

## 🧪 Testing Guidelines

### Manual Testing Checklist
- [ ] Form validation works correctly
- [ ] API calls return proper responses
- [ ] Error messages display appropriately
- [ ] Loading states work during operations
- [ ] Authentication persists on refresh
- [ ] Protected routes require authentication
- [ ] Responsive design works on mobile

### Browser Developer Tools
- Check Network tab for API calls
- Monitor Console for JavaScript errors
- Verify localStorage for auth tokens
- Test responsive breakpoints

## 🚀 Deployment Considerations

### Environment Variables
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
# Add other production variables as needed
```

### Build Optimization
- Ensure all dependencies are production-ready
- Verify TypeScript compilation
- Check for any build warnings
- Test production build locally

## 📚 Additional Documentation

- **FRONTEND_IMPLEMENTATION_GUIDE.md** - Comprehensive development guide
- **AUTH_IMPLEMENTATION_SUMMARY.md** - Authentication system details
- **SETUP_GUIDE.md** - Setup and testing instructions
- **QUICK_START.md** - 5-minute quick start guide
- **ROUTES_SUMMARY.md** - Route structure and navigation

## 🆘 Common Issues & Solutions

### Authentication Issues
- **Token not persisting**: Check localStorage limits and browser settings
- **Redirect loops**: Clear localStorage and check AuthGuard logic
- **CORS errors**: Verify backend CORS configuration

### Development Issues
- **Module not found**: Check import paths and TypeScript paths
- **Hydration errors**: Ensure client/server component boundaries
- **Build failures**: Check for TypeScript errors and missing dependencies

### API Issues
- **Network errors**: Verify backend URL in environment variables
- **401 Unauthorized**: Check token expiry and refresh logic
- **Validation errors**: Ensure frontend validation matches backend

---

**Last Updated**: December 2025  
**Project Version**: 0.1.0  
**Status**: Production Ready  

This guide should be referenced whenever making changes to ensure consistency with the project's architecture and patterns.