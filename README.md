# Paper Planes - Twitter Bot Management Platform

A full-stack application for managing automated Twitter bots with subscription-based pricing tiers.

## Features

- **Twitter OAuth Authentication** - Login with your Twitter account
- **Dark Theme UI** - Matches Twitter/X interface design
- **Bot Management** - Create, schedule, and manage Twitter bot missions
- **Subscription Tiers** - Different pricing based on API key ownership
- **Admin Panel** - Comprehensive user and system management
- **Context Funnel** - Upload custom data to enhance bot responses
- **Real-time Post Tracking** - Monitor generated and posted content

## Tech Stack

**Backend:**
- Node.js with TypeScript
- Express.js RESTful API
- MongoDB with Mongoose
- Twitter API v2 integration
- Stripe payment processing
- JWT authentication
- Cron-based scheduling

**Frontend:**
- React with TypeScript
- Material-UI dark theme
- Redux for state management
- React Router for navigation
- Axios for API calls

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB running locally or connection string
- Twitter Developer Account with API v2 access
- Stripe account for payments

### 1. Clone and Install Dependencies

```bash
cd /home/apex_user/hologami/paper-planes
npm install
```

### 2. Environment Configuration

The backend `.env` file is already configured with:
- Twitter API credentials
- MongoDB connection
- Stripe keys
- JWT secret
- Mail configuration
- Additional service keys

### 3. Start Development Servers

```bash
# Start both backend (port 5000) and frontend (port 3000)
npm run dev
```

Or start individually:
```bash
# Backend only
cd backend && npm run dev

# Frontend only  
cd frontend && npm run dev
```

### 4. Database Setup

MongoDB will automatically create collections on first use. No migrations needed.

## Subscription Pricing

### Using Shared API Keys
- **Monthly**: $100/month (Product ID: `prod_SyfB70xwWsnV0b`)
- **Annual**: $1,000/year (Product ID: `prod_SyfDVDL5Dpq1I5`)

### Using Own API Keys
- **Monthly**: $20/month (Product ID: `prod_SyfE9zxGySSLc0`)  
- **Annual**: $225/year (Product ID: `prod_SyfFkur332pLYD`)

## Admin Access

The user `cottoisaiah` is automatically granted admin privileges upon first login via Twitter OAuth.

## API Key Management

- Users can provide their own Twitter API keys for discounted pricing
- Only last 4 digits of keys are displayed in the UI
- API keys are securely stored and encrypted
- Automatic fallback to shared keys if user keys are invalid

## Bot Functionality

1. **Mission Creation** - Define objectives, schedules, and target keywords
2. **Cron Scheduling** - Automated execution based on user-defined intervals
3. **Context Integration** - Uses uploaded context data for better responses
4. **Post Generation** - Creates relevant content based on mission parameters
5. **Twitter Integration** - Automatically posts to Twitter via API

## Security Features

- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- Encrypted API key storage
- CORS protection
- Helmet security headers

## Project Structure

```
paper-planes/
├── backend/
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Authentication & validation
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── store/          # Redux store & slices
│   │   └── utils/          # Helper functions
│   └── package.json
├── shared/                 # Common types & utilities
└── package.json           # Root workspace config
```

## Development Notes

- Uses npm workspaces for monorepo management
- TypeScript throughout for type safety
- ESLint & Prettier for code formatting
- Hot reload enabled for both frontend and backend
- Proxy configuration routes `/api/*` to backend

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Update environment variables for production
3. Configure reverse proxy (nginx) to serve frontend and proxy API calls
4. Set up SSL certificates
5. Configure MongoDB Atlas or production database
6. Set up Stripe webhooks for subscription management

## API Endpoints

### Authentication
- `POST /api/auth/twitter` - Initiate Twitter OAuth
- `POST /api/auth/twitter/callback` - Handle OAuth callback
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/api-keys` - Update Twitter API keys

### Missions
- `GET /api/missions` - List user missions
- `POST /api/missions` - Create new mission
- `PUT /api/missions/:id` - Update mission
- `DELETE /api/missions/:id` - Delete mission

### Bots
- `POST /api/bots/start/:missionId` - Start bot mission
- `POST /api/bots/stop/:missionId` - Stop bot mission

### Posts
- `GET /api/posts` - List generated posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Context
- `GET /api/context` - List context items
- `POST /api/context` - Add context item
- `PUT /api/context/:id` - Update context item
- `DELETE /api/context/:id` - Delete context item

### Subscriptions
- `POST /api/stripe/create-subscription` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Admin (Admin Only)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/missions` - List all missions
- `GET /api/admin/posts` - List all posts

## Contributing

1. Follow TypeScript best practices
2. Maintain dark theme consistency
3. Add proper error handling
4. Include appropriate logging
5. Test subscription flows thoroughly

## License

Proprietary - All rights reserved
