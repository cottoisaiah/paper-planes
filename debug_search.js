require('dotenv').config({ path: '/home/apex_user/hologami/paper-planes/backend/.env.production' });
const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function debugSearchResponse() {
  try {
    console.log('🔧 SEARCH RESPONSE DEBUGGING');
    console.log('============================');

    const searchResult = await client.v2.search('chainlink', { max_results: 10 });
    
    console.log('📊 Search Response Analysis:');
    console.log('   Response type:', typeof searchResult);
    console.log('   Response keys:', Object.keys(searchResult));
    console.log('   Has data:', 'data' in searchResult);
    console.log('   Data value:', searchResult.data);
    console.log('   Data type:', typeof searchResult.data);
    console.log('   Data is array:', Array.isArray(searchResult.data));
    console.log('   Meta info:', searchResult.meta);
    
    // Check for tweets in different response structure
    if (searchResult.tweets) {
      console.log('   ✅ Found tweets in .tweets property:', searchResult.tweets.length);
    }
    
    // Raw dump of first few properties
    console.log('\n📝 Raw response structure:');
    console.log(JSON.stringify(searchResult, null, 2));

  } catch (error) {
    console.error('❌ Search debug failed:', error.message);
    if (error.data) {
      console.error('Error data:', JSON.stringify(error.data, null, 2));
    }
  }
}

debugSearchResponse();
