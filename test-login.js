const body = JSON.stringify({ "0": { "json": { "username": "admin", "password": "admin123" } } });
fetch("http://localhost:3000/api/trpc/auth.login?batch=1", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body
}).then(res => {
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
}).catch(console.error);
