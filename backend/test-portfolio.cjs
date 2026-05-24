const http = require('http');

async function run() {
  // 1. Signup
  const signupRes = await fetch('http://localhost:5050/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', email: 'test' + Date.now() + '@test.com', password: 'Password123!' })
  });
  
  const signupData = await signupRes.json();
  console.log('Signup:', signupData.success ? 'OK' : signupData);
  
  const token = signupData.data.accessToken;
  const cookies = signupRes.headers.get('set-cookie');
  console.log('Cookies:', cookies);
  
  // 2. Fetch Portfolio
  const pRes = await fetch('http://localhost:5050/api/user/portfolio', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Cookie': cookies
    }
  });
  
  const pData = await pRes.json();
  console.log('Portfolio:', pData);
}

run().catch(console.error);
