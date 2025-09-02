require('dotenv').config({ path: '.env.production' });

console.log('🔍 Checking what credentials PlatformTwitterService is loading...\n');

console.log('Environment variables:');
console.log('TWITTER_API_KEY:', process.env.TWITTER_API_KEY ? 'EXISTS' : 'MISSING');
console.log('TWITTER_API_SECRET:', process.env.TWITTER_API_SECRET ? 'EXISTS' : 'MISSING');
console.log('TWITTER_ACCESS_TOKEN:', process.env.TWITTER_ACCESS_TOKEN ? 'EXISTS' : 'MISSING');
console.log('TWITTER_ACCESS_TOKEN_SECRET:', process.env.TWITTER_ACCESS_TOKEN_SECRET ? 'EXISTS' : 'MISSING');

console.log('\nActual values:');
console.log('TWITTER_API_KEY:', process.env.TWITTER_API_KEY);
console.log('TWITTER_API_SECRET:', process.env.TWITTER_API_SECRET);
console.log('TWITTER_ACCESS_TOKEN:', process.env.TWITTER_ACCESS_TOKEN);
console.log('TWITTER_ACCESS_TOKEN_SECRET:', process.env.TWITTER_ACCESS_TOKEN_SECRET);

console.log('\n🧪 Testing manual Twitter API call with these credentials...');

const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

client.v2.userByUsername('_cottoisaiah', {
  'user.fields': ['public_metrics']
}).then(response => {
  console.log('✅ Direct API call successful!');
  console.log('   Username:', response.data.username);
  console.log('   Followers:', response.data.public_metrics?.followers_count);
  
  // Now test follower fetch
  console.log('\n🧪 Testing follower fetch...');
  return client.v2.followers(response.data.id, {
    max_results: 5,
    'user.fields': ['username', 'name']
  });
}).then(followersResponse => {
  console.log('✅ Follower fetch successful!');
  console.log('   Followers returned:', followersResponse.data?.length || 0);
  if (followersResponse.data && followersResponse.data.length > 0) {
    console.log('   First follower:', followersResponse.data[0].username);
  }
}).catch(error => {
  console.error('❌ API call failed:');
  console.error('   Message:', error.message);
  console.error('   Code:', error.code);
  if (error.data) {
    console.error('   Details:', JSON.stringify(error.data, null, 2));
  }
});
