# Paper Planes - AI-Powered Twitter Analytics & Bot Management Platform

A comprehensive full-stack application for managing automated Twitter bots with advanced analytics, AI content generation, and subscription-based pricing tiers.

## Features

### Core Platform
- **Twitter OAuth Authentication** - Secure login with your Twitter account
- **Dark Theme UI** - Modern design matching Twitter/X interface
- **Mobile-First Responsive Design** - Optimized for all devices

### Analytics Dashboard
- **Beautiful Chart Visualizations** - Comprehensive engagement and growth tracking
- **Engagement Trend Analysis** - Track performance metrics over time
- **Follower Growth Tracking** - Monitor audience development with trend analysis
- **Post Frequency Analytics** - Correlate posting patterns with engagement rates
- **Follow/Unfollow Trend Mapping** - Analyze follower behavior patterns
- **Real-time Social Metrics** - Live tracking of followers, following, and engagement

### AI Content Generation
- **Grok-4 Integration** - Advanced AI content creation using xAI API
- **Context-Aware Generation** - Uses uploaded context data for relevant content
- **Multiple Content Styles** - Professional, casual, engaging, and humorous tones
- **Content Variations** - Generate multiple options for each prompt
- **Smart Prompt Enhancement** - Intelligent context integration

### Bot Management
- **Mission Creation & Scheduling** - Define objectives and automated posting schedules
- **Context Funnel System** - Upload custom data to enhance bot responses
- **Real-time Post Tracking** - Monitor generated and posted content
- **Cron-based Automation** - Reliable scheduled posting

### Business Features
- **Subscription Tiers** - Flexible pricing based on API key ownership
- **Admin Panel** - Comprehensive user and system management
- **Secure Payment Processing** - Stripe integration with webhook handling
- **API Key Management** - Secure storage with encryption and last-4-digit display

## Tech Stack

**Backend:**
- Node.js with TypeScript
- Express.js RESTful API
- MongoDB with Mongoose ODM
- Twitter API v2 integration with social metrics collection
- XAI (Grok-4) API integration for content generation
- Stripe payment processing with webhook support
- JWT authentication with proper secret management
- Cron-based scheduling system
- Real-time analytics data processing
- Comprehensive social metrics tracking

**Frontend:**
- React with TypeScript
- Material-UI with custom dark theme
- Chart.js & react-chartjs-2 for data visualization
- Mobile-responsive design with Material-UI breakpoints
- Context API for state management
- React Router with protected routes
- Axios for API communication
- Real-time dashboard updates

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB running locally or Atlas connection string
- Twitter Developer Account with API v2 access and elevated permissions
- Stripe account for payment processing
- XAI API key for Grok-4 content generation

### 1. Clone and Install Dependencies

```bash
cd /home/apex_user/hologami/paper-planes
npm install
```

### 2. Environment Configuration

The backend `.env.production` file is pre-configured with:
- **Twitter API Credentials** - Bearer token, API key/secret, access tokens
- **MongoDB Connection** - Database URI for user and analytics data
- **Stripe Integration** - Public/secret keys and webhook endpoints
- **JWT Authentication** - Secret key for token signing
- **XAI API Access** - Grok-4 integration for content generation
- **Email Configuration** - SMTP settings for notifications

Required environment variables:
```bash
# Twitter API (X Developer Portal)
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

# Database
MONGODB_URI=mongodb://localhost:27017/paper-planes

# Authentication
JWT_SECRET=your-secure-jwt-secret

# Payment Processing
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AI Content Generation
XAI_API_KEY=your_xai_api_key
```

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

## Live Repository

🚀 **GitHub Repository**: https://github.com/cottoisaiah/paper-planes

The complete codebase is available on GitHub with comprehensive documentation and deployment-ready configuration.

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

### Analytics & Social Metrics
- `GET /api/analytics/engagement` - Get engagement trend data
- `GET /api/analytics/followers` - Get follower growth analytics
- `GET /api/analytics/posts` - Get post frequency analysis
- `GET /api/analytics/social-metrics` - Get current social metrics
- `GET /api/social/followers` - Get detailed follower list
- `GET /api/social/following` - Get following list

### AI Content Generation
- `POST /api/ai/generate-content` - Generate content with Grok-4
- `POST /api/ai/enhance-prompt` - Enhance prompts with context
- `GET /api/ai/content-styles` - Get available content styles

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
- `GET /api/stripe/subscription-status` - Check subscription status

### Admin (Admin Only)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/missions` - List all missions
- `GET /api/admin/posts` - List all posts
- `GET /api/admin/analytics` - Get platform-wide analytics

## Contributing

1. Follow TypeScript best practices and maintain type safety
2. Maintain dark theme consistency across all components
3. Ensure mobile responsiveness for new features
4. Add comprehensive error handling and logging
5. Test subscription flows and payment processing thoroughly
6. Validate analytics data accuracy and chart functionality
7. Test AI content generation with various contexts
8. Follow Material-UI design patterns and accessibility guidelines

## Troubleshooting

### Twitter API Issues
- Ensure API keys have elevated access in X Developer Portal
- Check rate limits if seeing 429 errors
- Verify API key permissions for follower data access
- Regenerate tokens if seeing 401 authentication errors

### Analytics Not Showing Data
- Verify Twitter API credentials are valid
- Check MongoDB connection and socialMetrics collection
- Ensure user has sufficient API permissions
- Review backend logs for specific error messages

### Subscription Problems
- Confirm Stripe webhook URL is correctly configured
- Check Stripe dashboard for failed payments
- Verify product IDs match environment configuration
- Test with Stripe test cards in development

### AI Content Generation Issues
- Verify XAI API key is valid and has credits
- Check prompt length limits and content policies
- Ensure context data is properly formatted
- Review XAI API documentation for rate limits

## License

Proprietary - All rights reserved
