import { API_BASE_URL } from "../API/http";
import { api } from "./payrollApi";

const originalFetch = global.fetch;

beforeEach(() => {
  document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
  document.cookie = "XSRF-TOKEN=raw-csrf-cookie; path=/";
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "masked-csrf-token" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 101 }),
    });
});

afterEach(() => {
  document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
  if (originalFetch) global.fetch = originalFetch;
  else delete global.fetch;
});

test("sends the raw CSRF cookie with onboarding writes", async () => {
  await api.saveEmployeeOnboarding({ name: "Asha Rao" });

  expect(global.fetch).toHaveBeenNthCalledWith(1, `${API_BASE_URL}/users/csrf`, {
    credentials: "include",
  });
  const [, request] = global.fetch.mock.calls[1];
  expect(request.headers["X-XSRF-TOKEN"]).toBe("raw-csrf-cookie");
});
