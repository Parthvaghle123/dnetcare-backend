async function run() {
  const url = 'http://localhost:7001/api/v1/pricing-inquiry';
  const payload = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '9876543210'
  };

  console.log('Sending request to:', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Response Data:', data);
  } catch(e) {
    console.error('Error:', e);
  }
}
run();
