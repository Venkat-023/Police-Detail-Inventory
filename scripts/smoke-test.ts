const baseUrl = process.env.BASE_URL || "http://localhost:3001";

async function request(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) }
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, headers: res.headers };
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const health = await request("/health");
assert(health.status === 200, "health endpoint failed");

const login = await request("/api/v1/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "gf@compilecraft.com", password: "Test1234!" })
});
assert(login.status === 200, `login failed: ${JSON.stringify(login.body)}`);
const token = login.body.data.accessToken;

const slips = await request("/api/v1/slips", { headers: { authorization: `Bearer ${token}` } });
assert(slips.status === 200, `GET /slips failed: ${JSON.stringify(slips.body)}`);

const forbidden = await request("/api/v1/roles", { headers: { authorization: `Bearer ${token}` } });
assert(forbidden.status === 403, "Vendor GF should not read roles");

const csrf = await request("/api/v1/slips", {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify({})
});
assert(csrf.status === 403, "state-changing request without X-PDM-Request should be rejected");

console.log("Smoke test passed:", {
  health: health.status,
  login: login.status,
  slips: slips.status,
  vendorGfRolesDenied: forbidden.status,
  csrfDenied: csrf.status
});
