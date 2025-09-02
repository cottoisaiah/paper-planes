require('dotenv').config({ path: '.env.production' });
const express = require('express');
const jwt = require('jsonwebtoken');

// Create a test JWT token for @_cottoisaiah
const testUserId = '68b64a2c4669de4c738d64a0'; // Real user ID for @_cottoisaiah
const testToken = jwt.sign({ id: testUserId }, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log('🔑 Test JWT Token (valid for 1 hour):');
console.log(testToken);
console.log('');
console.log('🧪 Test the API endpoints with this token:');
console.log('');
console.log('curl -H "Authorization: Bearer ' + testToken + '" https://paper-planes.redexct.xyz/api/analytics/social-metrics');
console.log('');
console.log('curl -H "Authorization: Bearer ' + testToken + '" https://paper-planes.redexct.xyz/api/analytics/summary');
