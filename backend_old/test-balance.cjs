const http = require('http');

async function run() {
  const signupRes = await fetch('http://localhost:5050/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test2', email: 'test2' + Date.now() + '@test.com', password: 'Password123!' })
  });
  
  const signupData = await signupRes.json();
  const token = signupData.data.accessToken;
  const cookies = signupRes.headers.get('set-cookie');
  
  const pRes = await fetch('http://localhost:5050/api/wallet/balance', {
    headers: { 'Authorization': 'Bearer ' + token, 'Cookie': cookies }
  });
  
  const pData = await pRes.json();
  console.log('Balance:', pData);
}

run().catch(console.error);
