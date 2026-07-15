const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Login first
  const loginRes = await request({
    hostname: 'localhost', port: 7000, path: '/api/v1/auth/login',
    method: 'POST', headers: { 'Content-Type': 'application/json' }
  }, { email: 'parthvaghela1407@gmail.com', password: 'Test@1234' });

  if (!loginRes.data?.data?.access_token) {
    console.log('Login failed:', JSON.stringify(loginRes.data, null, 2));
    return;
  }

  const token = loginRes.data.data.access_token;
  console.log('Login successful\n');

  // Get treatment plans
  const plansRes = await request({
    hostname: 'localhost', port: 7000,
    path: '/api/v1/treatment-plans?patient_id=b64a6473-31fc-4dde-bdda-f23f46fc7cd7',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });

  console.log('Status:', plansRes.status);
  console.log('Response structure:');
  console.log(JSON.stringify(plansRes.data, null, 2));
}
main().catch(console.error);
