import { API_BASE_URL } from "../API/http";

const BASE = (process.env.REACT_APP_PAYROLL_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

async function handle(res) {
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).message || msg; } catch { /* no body */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

async function csrfHeaders() {
  const response = await fetch(`${API_BASE_URL}/users/csrf`, { credentials: "include" });
  if (!response.ok) throw new Error("Could not initialize request security");
  await response.json();
  const csrfCookie = document.cookie.split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.slice("XSRF-TOKEN=".length);
  if (!csrfCookie) throw new Error("The hospital session did not provide a request security cookie");
  return { "X-XSRF-TOKEN": csrfCookie };
}

const req = async (url, method = "GET", body) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = isFormData ? {} : { "Content-Type": "application/json" };
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    Object.assign(headers, await csrfHeaders());
  }
  const response = await fetch(BASE + url, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
  return handle(response);
};

async function download(url) {
  const response = await fetch(BASE + url, { credentials: "include" });
  if (!response.ok) return handle(response);
  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const encodedName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quotedName = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
  const fileName = encodedName
    ? decodeURIComponent(encodedName)
    : quotedName || "employee-document";
  return { blob: await response.blob(), fileName };
}

export const api = {
  employees: () => req("/employees"),
  employeeRoles: () => req("/employees/roles"),
  saveEmployee: (e) => (e.id ? req(`/employees/${e.id}`, "PUT", e) : req("/employees", "POST", e)),
  saveEmployeeOnboarding: (e) => (e.id
    ? req(`/employees/${e.id}/onboard`, "PUT", e)
    : req("/employees/onboard", "POST", e)),
  employeeDocuments: (id) => req(`/employees/${id}/documents`),
  employeeProfilePicture: async (id) => {
    const response = await fetch(`${BASE}/employees/${id}/profile-picture`, { credentials: "include" });
    if (response.status === 404) return null;
    if (!response.ok) return handle(response);
    return response.blob();
  },
  uploadEmployeeProfilePicture: (id, file) => {
    const body = new FormData();
    body.append("file", file);
    return req(`/employees/${id}/profile-picture`, "POST", body);
  },
  uploadEmployeeDocument: (id, type, file) => {
    const body = new FormData();
    body.append("file", file);
    return req(`/employees/${id}/documents/${type}`, "POST", body);
  },
  downloadEmployeeDocument: (id, type) => download(`/employees/${id}/documents/${type}/download`),
  deleteEmployeeDocument: (id, type) => req(`/employees/${id}/documents/${type}`, "DELETE"),

  structures: () => req("/structures"),
  saveStructure: (s) => (s.id ? req(`/structures/${s.id}`, "PUT", s) : req("/structures", "POST", s)),
  deleteStructure: (id) => req(`/structures/${id}`, "DELETE"),
  previewStructure: (structure, monthlyGross) => req("/structures/preview", "POST", { structure, monthlyGross }),

  attendance: (month) => req(`/attendance?month=${month}`),
  setAttendance: (body) => req("/attendance", "PUT", body),

  payroll: (month) => req(`/payroll/${month}`),
  runPayroll: (month) => req(`/payroll/${month}/run`, "POST"),
  runs: () => req("/payroll/runs"),

  autoRun: () => req("/settings/auto-run"),
  setAutoRun: (enabled) => req("/settings/auto-run", "PUT", { enabled }),
};
