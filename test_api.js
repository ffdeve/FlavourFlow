fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer re_iot5zFm8_DECsqoQTUyog9uMYkhyNiUWi',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'onboarding@resend.dev',
    to: 'devassets@gmail.com',
    subject: 'Test API Connection',
    html: '<p>Testing connection</p>'
  })
})
.then(res => res.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));
