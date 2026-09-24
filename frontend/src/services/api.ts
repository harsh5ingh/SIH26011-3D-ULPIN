import {
  Parcel,
  Building,
  Floor,
  PropertyUnit,
  PropertyGeometry,
  Evidence,
  ValidationSummary,
  ConfidenceScore,
  ReviewCase,
  IssueReport,
  Infrastructure,
  StructureCandidate,
  SearchResponse,
  AuditEvent,
} from "../types";

/* ==========================================================================
   CONFIGURATION
========================================================================== */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

const TOKEN_KEY = "geovista_token";
const USER_KEY = "geovista_user";

/* ==========================================================================
   AUTH TYPES
========================================================================== */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "public" | "officer";
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: "public" | "officer";
  officer_code?: string;
}

export interface SigninData {
  email: string;
  password: string;
  role: "public" | "officer";
}

/* ==========================================================================
   AUTH STORAGE
========================================================================== */

const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

const setAuth = (data: AuthResponse): void => {
  localStorage.setItem(
    TOKEN_KEY,
    data.access_token,
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(data.user),
  );
};

const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/* ==========================================================================
   REQUEST TYPES
========================================================================== */

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

/* ==========================================================================
   RESPONSE HANDLER
========================================================================== */

async function handleResponse<T>(
  response: Response,
): Promise<T> {
  const contentType =
    response.headers.get("content-type") || "";

  let payload: unknown = null;

  try {
    if (
      contentType.includes(
        "application/json",
      )
    ) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }
  } catch {
    payload = null;
  }

  if (!response.ok) {
    let message =
      `HTTP ${response.status}`;

    if (
      typeof payload === "string" &&
      payload.trim()
    ) {
      message = payload;
    }

    if (
      payload &&
      typeof payload === "object"
    ) {
      const data =
        payload as Record<
          string,
          unknown
        >;

      if (
        typeof data.detail ===
        "string"
      ) {
        message = data.detail;
      } else if (
        typeof data.message ===
        "string"
      ) {
        message = data.message;
      } else if (
        typeof data.error ===
        "string"
      ) {
        message = data.error;
      }
    }

    throw new Error(message);
  }

  return payload as T;
}

/* ==========================================================================
   REQUEST HELPER
========================================================================== */

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    headers,
    ...fetchOptions
  } = options;

  const requestHeaders =
    new Headers(headers);

  /*
   * Automatically send JSON content type
   * whenever a request contains a body.
   */
  if (
    fetchOptions.body &&
    !requestHeaders.has(
      "Content-Type",
    )
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );
  }

  /*
   * Attach JWT when authentication
   * is enabled.
   */
  if (auth) {
    const token = getToken();

    if (token) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        ...fetchOptions,
        headers: requestHeaders,
      },
    );
  } catch (error) {
    console.error(
      "GeoVISTA API request failed:",
      error,
    );

    throw new Error(
      "Unable to connect to GeoVISTA backend. Make sure the backend server is running.",
    );
  }

  /*
   * If token expired/invalid, clear local
   * authentication state.
   *
   * Do not redirect here. The React app
   * should decide where to navigate.
   */
  if (
    response.status === 401 &&
    auth
  ) {
    clearAuth();
  }

  return handleResponse<T>(
    response,
  );
}

/* ==========================================================================
   API
========================================================================== */

export const api = {
  /* ========================================================================
     HEALTH
  ======================================================================== */

  getHealth: (): Promise<{
    status: string;
    project?: string;
  }> =>
    request("/health", {
      auth: false,
    }),

  /* ========================================================================
     AUTHENTICATION
  ======================================================================== */

  signup: async (
    data: SignupData,
  ): Promise<AuthResponse> => {
    const response =
      await request<AuthResponse>(
        "/api/auth/signup",
        {
          method: "POST",
          auth: false,
          body: JSON.stringify(data),
        },
      );

    setAuth(response);

    return response;
  },

  signin: async (
    data: SigninData,
  ): Promise<AuthResponse> => {
    const response =
      await request<AuthResponse>(
        "/api/auth/signin",
        {
          method: "POST",
          auth: false,
          body: JSON.stringify(data),
        },
      );

    setAuth(response);

    return response;
  },

  me: async (): Promise<AuthMeResponse> => {
    const response =
      await request<AuthMeResponse>(
        "/api/auth/me",
      );

    if (response.user) {
      localStorage.setItem(
        USER_KEY,
        JSON.stringify(
          response.user,
        ),
      );
    }

    return response;
  },

  logout: (): void => {
    clearAuth();
  },

  getToken,

  getCurrentUser:
    (): AuthUser | null => {
      return getStoredUser();
    },

  isAuthenticated:
    (): boolean => {
      return Boolean(getToken());
    },

  /* ========================================================================
     SEARCH
  ======================================================================== */

  search: (
    query: string,
  ): Promise<SearchResponse> =>
    request<SearchResponse>(
      `/api/search?q=${encodeURIComponent(
        query,
      )}`,
    ),

  /* ========================================================================
     PARCELS
  ======================================================================== */

  getParcels: (
    areaType?: "URBAN" | "RURAL",
  ): Promise<Parcel[]> => {
    const query = areaType
      ? `?area_type=${encodeURIComponent(
          areaType,
        )}`
      : "";

    return request<Parcel[]>(
      `/api/parcels${query}`,
    );
  },

  getParcel: (
    id: string,
  ): Promise<Parcel> =>
    request<Parcel>(
      `/api/parcels/${encodeURIComponent(
        id,
      )}`,
    ),

  getParcelBuildings: (
    parcelId: string,
  ): Promise<Building[]> =>
    request<Building[]>(
      `/api/parcels/${encodeURIComponent(
        parcelId,
      )}/buildings`,
    ),

  getParcelInfrastructures: (
    parcelId: string,
  ): Promise<Infrastructure[]> =>
    request<Infrastructure[]>(
      `/api/parcels/${encodeURIComponent(
        parcelId,
      )}/infrastructures`,
    ),

  getParcelCandidates: (
    parcelId: string,
  ): Promise<StructureCandidate[]> =>
    request<StructureCandidate[]>(
      `/api/parcels/${encodeURIComponent(
        parcelId,
      )}/candidates`,
    ),

  getParcelEvidence: (
    parcelId: string,
  ): Promise<Evidence[]> =>
    request<Evidence[]>(
      `/api/parcels/${encodeURIComponent(
        parcelId,
      )}/evidence`,
    ),

  /* ========================================================================
     BUILDINGS
  ======================================================================== */

  getBuildings:
    (): Promise<Building[]> =>
      request<Building[]>(
        "/api/buildings",
      ),

  getBuilding: (
    id: string,
  ): Promise<Building> =>
    request<Building>(
      `/api/buildings/${encodeURIComponent(
        id,
      )}`,
    ),

  getBuildingFloors: (
    id: string,
  ): Promise<Floor[]> =>
    request<Floor[]>(
      `/api/buildings/${encodeURIComponent(
        id,
      )}/floors`,
    ),

  getBuildingProperties: (
    id: string,
  ): Promise<PropertyUnit[]> =>
    request<PropertyUnit[]>(
      `/api/buildings/${encodeURIComponent(
        id,
      )}/properties`,
    ),

  /* ========================================================================
     PROPERTIES
  ======================================================================== */

  getProperties:
    (): Promise<PropertyUnit[]> =>
      request<PropertyUnit[]>(
        "/api/properties",
      ),

  getProperty: (
    id: string,
  ): Promise<PropertyUnit> =>
    request<PropertyUnit>(
      `/api/properties/${encodeURIComponent(
        id,
      )}`,
    ),

  getPropertyGeometry: (
    id: string,
  ): Promise<PropertyGeometry> =>
    request<PropertyGeometry>(
      `/api/properties/${encodeURIComponent(
        id,
      )}/geometry`,
    ),

  getPropertyEvidence: (
    id: string,
  ): Promise<Evidence[]> =>
    request<Evidence[]>(
      `/api/properties/${encodeURIComponent(
        id,
      )}/evidence`,
    ),

  getPropertyConfidence: (
    id: string,
  ): Promise<ConfidenceScore> =>
    request<ConfidenceScore>(
      `/api/properties/${encodeURIComponent(
        id,
      )}/confidence`,
    ),

  getPropertyValidation: (
    id: string,
  ): Promise<ValidationSummary> =>
    request<ValidationSummary>(
      `/api/properties/${encodeURIComponent(
        id,
      )}/validation`,
    ),

  validateProperty: (
    id: string,
  ): Promise<ValidationSummary> =>
    request<ValidationSummary>(
      `/api/properties/${encodeURIComponent(
        id,
      )}/validate`,
      {
        method: "POST",
      },
    ),

  /* ========================================================================
     INFRASTRUCTURE
  ======================================================================== */

  getUnderground:
    (): Promise<Infrastructure[]> =>
      request<Infrastructure[]>(
        "/api/infrastructures/underground",
      ),

  getElevated:
    (): Promise<Infrastructure[]> =>
      request<Infrastructure[]>(
        "/api/infrastructures/elevated",
      ),

  /* ========================================================================
     REVIEWS
  ======================================================================== */

  getReviews:
    (): Promise<ReviewCase[]> =>
      request<ReviewCase[]>(
        "/api/reviews",
      ),

  getReview: (
    id: string,
  ): Promise<ReviewCase> =>
    request<ReviewCase>(
      `/api/reviews/${encodeURIComponent(
        id,
      )}`,
    ),

  approveReview: (
    id: string,
    reason: string,
  ): Promise<ReviewCase> =>
    request<ReviewCase>(
      `/api/reviews/${encodeURIComponent(
        id,
      )}/approve`,
      {
        method: "POST",
        body: JSON.stringify({
          reason,
        }),
      },
    ),

  rejectReview: (
    id: string,
    reason: string,
  ): Promise<ReviewCase> =>
    request<ReviewCase>(
      `/api/reviews/${encodeURIComponent(
        id,
      )}/reject`,
      {
        method: "POST",
        body: JSON.stringify({
          reason,
        }),
      },
    ),

  correctProperty: (
    id: string,
    data: {
      z_min_m?: number;
      z_max_m?: number;
      footprint_2d?: number[][];
      reason: string;
    },
  ): Promise<PropertyUnit> =>
    request<PropertyUnit>(
      `/api/reviews/${encodeURIComponent(
        id,
      )}/correct`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  /* ========================================================================
     REPORTS
  ======================================================================== */

  getReports:
    (): Promise<IssueReport[]> =>
      request<IssueReport[]>(
        "/api/reports",
      ),

  submitReport: (
    data: {
      property_id: string;
      title: string;
      description: string;
      contact_email: string;
      category?: string;
    },
  ): Promise<IssueReport> =>
    request<IssueReport>(
      "/api/reports",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  /* ========================================================================
     LiDAR
  ======================================================================== */

  analyzeLidar: (
    propertyId: string,
  ) =>
    request<unknown>(
      "/api/lidar/analyze",
      {
        method: "POST",
        body: JSON.stringify({
          property_id: propertyId,
        }),
      },
    ),

  /* ========================================================================
     AI
  ======================================================================== */

  runBuildingExtraction: (
    parcelId: string,
  ) =>
    request<unknown>(
      "/api/ai/building-extraction",
      {
        method: "POST",
        body: JSON.stringify({
          parcel_id: parcelId,
        }),
      },
    ),

  runFloorSegmentation: (
    buildingId: string,
  ) =>
    request<unknown>(
      "/api/ai/floor-segmentation",
      {
        method: "POST",
        body: JSON.stringify({
          building_id: buildingId,
        }),
      },
    ),

  runVerticalDelineation: (
    buildingId: string,
  ) =>
    request<unknown>(
      "/api/ai/vertical-delineation",
      {
        method: "POST",
        body: JSON.stringify({
          building_id: buildingId,
        }),
      },
    ),

  /* ========================================================================
     SIMULATIONS
  ======================================================================== */

  resetSimulation: () =>
    request<{
      message: string;
    }>(
      "/api/simulation/reset",
      {
        method: "POST",
      },
    ),

  triggerSpatialError: () =>
    request<unknown>(
      "/api/simulation/spatial-error",
      {
        method: "POST",
      },
    ),

  triggerMissingEvidence: () =>
    request<unknown>(
      "/api/simulation/missing-evidence",
      {
        method: "POST",
      },
    ),

  triggerMultiSourceConflict: () =>
    request<unknown>(
      "/api/simulation/multi-source-conflict",
      {
        method: "POST",
      },
    ),

  getRuralCandidates: () =>
    request<unknown>(
      "/api/simulation/rural-structure",
      {
        method: "POST",
      },
    ),

  /* ========================================================================
     AUDIT
  ======================================================================== */

  getAuditLog:
    (): Promise<AuditEvent[]> =>
      request<AuditEvent[]>(
        "/api/audit",
      ),

  getRevisions:
    (): Promise<unknown[]> =>
      request<unknown[]>(
        "/api/audit/revisions",
      ),
};

/* ==========================================================================
   AUTH STORAGE EXPORT
========================================================================== */

export const authStorage = {
  getToken,
  getUser: getStoredUser,
  setAuth,
  clearAuth,
};

export default api;