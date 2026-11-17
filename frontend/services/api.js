
import axios from "axios";
import * as SecureStore from "expo-secure-store";

// =====================================================
// API CONFIGURATION
// =====================================================

export const API_BASE_URL = "http://192.168.43.140:8000";

const TOKEN_KEY = "rx_analyzer_access_token";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// =====================================================
// TOKEN STORAGE
// =====================================================

export const tokenStorage = {
  async get() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async set(token) {
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async clear() {
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

// =====================================================
// UNAUTHORIZED RESPONSE HANDLER
// =====================================================

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.get();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    console.log("========== API ERROR ==========");
    console.log("URL:", requestUrl);
    console.log("Method:", error.config?.method);
    console.log("Status:", status);
    console.log(
      "Response:",
      JSON.stringify(error.response?.data ?? error.message)
    );
    console.log("===============================");

    // Expire the session if an authenticated request returns 401.
    // Avoid treating an incorrect login or registration as an expired session.
    const isAuthEndpoint =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register");

    if (status === 401 && !isAuthEndpoint && unauthorizedHandler) {
      try {
        await unauthorizedHandler();
      } catch (handlerError) {
        console.log(
          "Unauthorized handler error:",
          handlerError.message
        );
      }
    }

    return Promise.reject(error);
  }
);

// =====================================================
// AUTHENTICATION
// =====================================================

export async function registerUser(userData) {
  const { data } = await api.post("/api/auth/register", userData);

  if (data.access_token) {
    await tokenStorage.set(data.access_token);
  }

  return data;
}

export async function loginUser(credentials) {
  const { data } = await api.post("/api/auth/login", credentials);

  if (data.access_token) {
    await tokenStorage.set(data.access_token);
  }

  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

// Compatibility with AuthContext.js.
export async function fetchCurrentUser() {
  return getCurrentUser();
}

export async function logoutUser() {
  await tokenStorage.clear();
}

// =====================================================
// PRESCRIPTION SCANNING
// =====================================================

export async function scanPrescription(imageUri) {
  if (!imageUri || typeof imageUri !== "string") {
    throw new Error("Please select or capture a prescription image.");
  }

  const cleanUri = imageUri.split("?")[0];
  const extension = cleanUri.split(".").pop().toLowerCase();

  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };

  const mimeType = mimeTypes[extension] || "image/jpeg";
  const fileExtension = mimeTypes[extension] ? extension : "jpg";

  const formData = new FormData();

  formData.append("file", {
    uri: imageUri,
    name: `prescription.${fileExtension}`,
    type: mimeType,
  });

  console.log("SCAN: uploading prescription", {
    uri: imageUri,
    name: `prescription.${fileExtension}`,
    type: mimeType,
  });

  try {
    const token = await tokenStorage.get();

    const headers = {
      Accept: "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/scan`, {
      method: "POST",
      headers,
      body: formData,
    });

    const responseText = await response.text();

    let responseData;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = {
        detail: responseText || "Invalid server response.",
      };
    }

    if (!response.ok) {
      console.log("SCAN FAILURE:", response.status, responseData);

      const error = new Error(
        responseData.detail ||
          `Prescription scan failed with status ${response.status}.`
      );

      error.response = {
        status: response.status,
        data: responseData,
      };

      // Match the axios interceptor's session-expiration behavior.
      if (response.status === 401 && unauthorizedHandler) {
        await unauthorizedHandler();
      }

      throw error;
    }

    console.log("SCAN SUCCESS:", JSON.stringify(responseData));

    return responseData;
  } catch (error) {
    console.log(
      "SCAN FAILURE:",
      JSON.stringify(error.response?.data ?? error.message)
    );

    throw error;
  }
}

export async function extractPrescription(imageUri) {
  return scanPrescription(imageUri);
}

// =====================================================
// PRESCRIPTION STORAGE
// =====================================================

export async function savePrescription(prescription) {
  const { data } = await api.post("/api/prescriptions", prescription);
  return data;
}

export async function uploadPrescription(imageUri) {
  return scanPrescription(imageUri);
}

export async function listPrescriptions() {
  const { data } = await api.get("/api/prescriptions");
  return data;
}

export async function getPrescription(id) {
  const { data } = await api.get(`/api/prescriptions/${id}`);
  return data;
}

export async function updatePrescription(id, updates) {
  const { data } = await api.patch(`/api/prescriptions/${id}`, updates);
  return data;
}

export async function deletePrescription(id) {
  const { data } = await api.delete(`/api/prescriptions/${id}`);
  return data;
}

// =====================================================
// REMINDERS
// =====================================================


// =====================================================
// REMINDERS
// =====================================================

export async function listReminders(date) {
  const params = date ? { for_date: date } : {};
  const { data } = await api.get("/api/reminders", { params });
  return data;
}

export async function getDailyAdherence(date) {
  const params = date ? { for_date: date } : {};
  const { data } = await api.get("/api/reminders/adherence", { params });
  return data;
}

export async function updateReminderStatus(id, status) {
  const { data } = await api.patch(`/api/reminders/${id}`, { status });
  return data;
}

export async function createReminder(reminder) {
  const { data } = await api.post("/api/reminders", reminder);
  return data;
}

export async function updateReminder(id, updates) {
  const { data } = await api.patch(`/api/reminders/${id}`, updates);
  return data;
}

export async function deleteReminder(id) {
  const { data } = await api.delete(`/api/reminders/${id}`);
  return data;
}



// =====================================================
// EXPORT API CLIENT
// =====================================================

export { api };
export default api;



// =====================================================
// DOCTOR APPOINTMENTS
// =====================================================
export async function listAppointments() {
  const { data } = await api.get("/api/appointments");
  return data;
}
export async function createAppointment(appointment) {
  const { data } = await api.post("/api/appointments", appointment);
  return data;
}
export async function updateAppointment(id, appointment) {
  const { data } = await api.patch(`/api/appointments/${id}`, appointment);
  return data;
}
export async function deleteAppointment(id) {
  const { data } = await api.delete(`/api/appointments/${id}`);
  return data;
}

export async function seedDemoAppointments() {
  const response = await api.post("/api/appointments/seed-demo");
  return response.data;
}