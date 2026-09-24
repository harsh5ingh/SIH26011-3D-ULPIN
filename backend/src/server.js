import express from "express";
import cors from "cors";

import { settings } from "./config.js";

// =========================
// Routes
// =========================

import auth from "./routes/auth.js";
import parcels from "./routes/parcels.js";
import buildings from "./routes/buildings.js";
import properties from "./routes/properties.js";
import infrastructures from "./routes/infrastructures.js";
import reviews from "./routes/reviews.js";
import reports from "./routes/reports.js";
import lidar from "./routes/lidar.js";
import ai from "./routes/ai.js";
import search from "./routes/search.js";
import simulation from "./routes/simulation.js";
import audit from "./routes/audit.js";

const app = express();

// =========================
// CORS
// =========================

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from curl, Postman and server-to-server clients
      if (!origin) {
        return callback(null, true);
      }

      if (settings.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS origin not allowed.")
      );
    },

    credentials: true,
  })
);

// =========================
// Body Parser
// =========================

app.use(
  express.json({
    limit: "10mb",
  })
);

// =========================
// Request Logging
// =========================

app.use((req, _res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );

  next();
});

// =========================
// Root
// =========================

app.get("/", (_req, res) => {
  res.json({
    name: "GeoVISTA Node.js Backend",
    status: "RUNNING",
    version: "1.0.0",
    environment: settings.APP_ENV,
    docs: "/docs",
    openapi: "/openapi.json",
    health: "/health",
  });
});

// =========================
// Health Check
// =========================

app.get("/health", (_req, res) => {
  res.json({
    status: "HEALTHY",
    project: settings.PROJECT_NAME,
    problem_statement:
      settings.PROBLEM_STATEMENT_ID,
    title:
      settings.PROBLEM_STATEMENT_TITLE,
    organization:
      settings.ORGANIZATION,
    department:
      settings.DEPARTMENT,
    backend: "Node.js + Express",
    authentication: "JWT",
    privacy:
      "This prototype processes only project/demo data and files explicitly selected by the user. It does not scan personal files or folders.",
  });
});

// =========================
// Minimal OpenAPI
// =========================

app.get("/openapi.json", (_req, res) => {
  res.json({
    openapi: "3.0.0",

    info: {
      title: settings.PROJECT_NAME,
      version: "1.0.0",
      description:
        "GeoVISTA 3D ULPIN Node.js API",
    },

    servers: [
      {
        url: `http://localhost:${settings.PORT}`,
      },
    ],

    paths: {
      "/": {
        get: {
          summary: "API information",
        },
      },

      "/health": {
        get: {
          summary: "Health check",
        },
      },

      "/api/auth/signup": {
        post: {
          summary:
            "Create Public or Officer account",
        },
      },

      "/api/auth/signin": {
        post: {
          summary:
            "Authenticate Public or Officer account",
        },
      },

      "/api/auth/me": {
        get: {
          summary:
            "Get currently authenticated user",
        },
      },

      "/api/parcels": {
        get: {
          summary: "List parcels",
        },
      },

      "/api/buildings": {
        get: {
          summary: "List buildings",
        },
      },

      "/api/properties": {
        get: {
          summary: "List property units",
        },
      },

      "/api/search": {
        get: {
          summary: "Search GeoVISTA entities",
        },
      },

      "/api/health": {
        get: {
          summary: "API health",
        },
      },
    },
  });
});

// =========================
// Simple API Documentation
// =========================

app.get("/docs", (_req, res) => {
  res.type("html").send(`
<!doctype html>

<html lang="en">

<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <title>GeoVISTA API</title>

  <style>

    body {
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 40px;
    }

    .container {
      max-width: 1000px;
      margin: auto;
    }

    h1 {
      color: #075985;
    }

    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      margin: 15px 0;

      box-shadow:
        0 4px 15px rgba(15, 23, 42, 0.05);
    }

    code {
      background: #f1f5f9;
      padding: 4px 7px;
      border-radius: 6px;
    }

    a {
      color: #2563eb;
      text-decoration: none;
    }

    .method {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      background: #2563eb;
      color: white;
      font-size: 12px;
      font-weight: 700;
      margin-right: 8px;
    }

  </style>
</head>

<body>

<div class="container">

  <h1>GeoVISTA Node.js API</h1>

  <p>
    3D ULPIN Generation and Vertical Property
    Mapping System
  </p>

  <div class="card">

    <h2>System</h2>

    <p>
      Backend:
      <strong>Node.js + Express</strong>
    </p>

    <p>
      Authentication:
      <strong>JWT</strong>
    </p>

    <p>
      Environment:
      <strong>${settings.APP_ENV}</strong>
    </p>

  </div>

  <div class="card">

    <h2>Authentication</h2>

    <p>
      <span class="method">POST</span>
      <code>/api/auth/signup</code>
    </p>

    <p>
      <span class="method">POST</span>
      <code>/api/auth/signin</code>
    </p>

    <p>
      <span class="method">GET</span>
      <code>/api/auth/me</code>
    </p>

  </div>

  <div class="card">

    <h2>Core APIs</h2>

    <p><code>/api/parcels</code></p>
    <p><code>/api/buildings</code></p>
    <p><code>/api/properties</code></p>
    <p><code>/api/infrastructures</code></p>
    <p><code>/api/reviews</code></p>
    <p><code>/api/reports</code></p>
    <p><code>/api/lidar</code></p>
    <p><code>/api/ai</code></p>
    <p><code>/api/search</code></p>
    <p><code>/api/simulation</code></p>
    <p><code>/api/audit</code></p>

  </div>

  <div class="card">

    <p>
      <a href="/openapi.json">
        Open OpenAPI JSON →
      </a>
    </p>

    <p>
      <a href="/health">
        Check API Health →
      </a>
    </p>

  </div>

</div>

</body>

</html>
  `);
});

// =========================
// API Routes
// =========================

app.use("/api/auth", auth);

app.use("/api/parcels", parcels);
app.use("/api/buildings", buildings);
app.use("/api/properties", properties);
app.use(
  "/api/infrastructures",
  infrastructures
);
app.use("/api/reviews", reviews);
app.use("/api/reports", reports);
app.use("/api/lidar", lidar);
app.use("/api/ai", ai);
app.use("/api/search", search);
app.use("/api/simulation", simulation);
app.use("/api/audit", audit);

// =========================
// 404 Handler
// =========================

app.use((req, res) => {
  res.status(404).json({
    detail:
      `Route '${req.method} ${req.path}' not found.`,
  });
});

// =========================
// Global Error Handler
// =========================

app.use(
  (err, _req, res, _next) => {
    console.error(
      "[GeoVISTA ERROR]",
      err
    );

    if (
      err.message ===
      "CORS origin not allowed."
    ) {
      return res.status(403).json({
        detail:
          "Request blocked by CORS policy.",
      });
    }

    return res.status(
      err.status || 500
    ).json({
      detail:
        err.message ||
        "Internal server error",
    });
  }
);

// =========================
// Start Server
// =========================

app.listen(
  settings.PORT,
  settings.HOST,
  () => {
    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "       GeoVISTA Node.js Backend"
    );
    console.log(
      "========================================"
    );
    console.log(
      `Server : http://localhost:${settings.PORT}`
    );
    console.log(
      `Health : http://localhost:${settings.PORT}/health`
    );
    console.log(
      `Docs   : http://localhost:${settings.PORT}/docs`
    );
    console.log(
      `Env    : ${settings.APP_ENV}`
    );
    console.log(
      "========================================"
    );
    console.log("");
  }
);

export default app;