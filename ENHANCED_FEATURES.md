# Paper Planes - Enhanced Bot Platform

## 🚀 Major Update: Full Pilot Control & Advanced Capabilities

Paper Planes now offers comprehensive social media automation with full pilot control over mission behavior.

## ✨ New Features

### 🎯 Mission Types
- **Engagement**: Like, reply, and retweet existing content
- **Posting**: Create and schedule original posts
- **Hybrid**: Combination of engagement and original content creation

### 🤖 Enhanced Actions
- **Smart Likes**: Intelligent engagement with top-performing tweets
- **AI Replies**: Context-aware responses with configurable tones
- **Strategic Retweets**: Share relevant community content
- **Scheduled Posts**: Original content creation with dynamic templates

### ⚙️ Full Pilot Control
```typescript
{
  missionType: 'hybrid',
  actions: {
    like: { enabled: true, maxPerKeyword: 2 },
    reply: { enabled: true, maxPerKeyword: 1 },
    retweet: { enabled: false },
    post: { enabled: true, frequency: 'daily' }
  },
  customContent: {
    replyTones: ['technical', 'supportive', 'inquisitive'],
    postTemplates: [
      'Exploring the latest developments in {keyword} technology...',
      'The {keyword} ecosystem continues to evolve with exciting innovations.'
    ],
    topics: ['oracle technology', 'DeFi integration', 'smart contracts']
  }
}
```

### 🛡️ Rate Limiting & Compliance
- **15-minute window tracking** for Twitter API compliance
- **Action-specific limits**: Different quotas for likes, replies, posts
- **Intelligent backoff**: Automatically pauses when limits reached
- **Graceful recovery**: Resumes operations in next available window

### 🧠 AI Integration
- **Context-aware replies**: Analyzes tweet content for relevant responses
- **Template-based posting**: Dynamic content generation with keyword insertion
- **Tone matching**: Maintains consistent voice across interactions
- **Smart engagement**: Prioritizes high-quality content based on metrics

## 🔧 Technical Improvements

### Enhanced Architecture
- **Fixed Twitter API compatibility**: Proper handling of Basic plan response structure
- **Improved error handling**: Comprehensive rate limit and API error management
- **Enhanced data models**: Support for complex mission configurations
- **Modular design**: Separate services for AI replies and rate limiting

### API Enhancements
- **Search data structure**: Fixed `searchResults.data.data` access pattern
- **Real-time analytics**: Consistent follower data across dashboard
- **Enhanced mission model**: Support for custom content and action configuration
- **Comprehensive logging**: Detailed execution tracking and debugging

## 📋 Mission Configuration

### Basic Engagement Mission
```bash
# Create an engagement-focused mission
./create_mission.sh "Chainlink Engagement" engagement "Like and reply to Chainlink content"
```

### Posting Mission
```bash
# Create a posting-only mission
./create_mission.sh "Daily Insights" posting "Share daily insights about blockchain technology"
```

### Hybrid Mission
```bash
# Create a comprehensive hybrid mission
./create_mission.sh "Community Builder" hybrid "Engage with community and share original insights"
```

## 🛠️ Utility Scripts

- **`create_mission.sh`**: Create new missions with enhanced capabilities
- **`reschedule_mission.sh`**: Update mission schedules and timing
- **`verify_mission.sh`**: Check mission status and verify configuration

## 📊 Rate Limits & Compliance

### Twitter API Limits (Basic Plan)
- **Likes**: 300 per 15-minute window
- **Replies**: 300 per 15-minute window  
- **Posts**: 1,500 per month
- **Searches**: 10,000 per month

### Smart Rate Management
```typescript
// Automatic rate limit detection and handling
if (rateLimitHit) {
  console.log('⏰ Rate limit reached. Pausing engagement until next window.');
  await scheduleNextExecution(15); // Wait for rate limit reset
}
```

## 🚀 Getting Started

1. **Configure your mission type and actions**
2. **Set custom content templates and tones**
3. **Define target keywords and topics**
4. **Schedule execution frequency**
5. **Launch your Paper Plane!**

The enhanced Paper Planes platform gives you complete control over your social media automation strategy, whether you're building community engagement, sharing insights, or running comprehensive hybrid campaigns.

## 🔗 Links
- [GitHub Repository](https://github.com/cottoisaiah/paper-planes)
- [Twitter Integration Guide](docs/twitter-setup.md)
- [Mission Configuration Examples](docs/mission-examples.md)
