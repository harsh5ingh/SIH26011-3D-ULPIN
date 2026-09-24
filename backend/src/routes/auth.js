import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { settings } from "../config.js";

const router = express.Router();

/* ==========================================================================
   DEMO OFFICER ACCOUNT
   Prototype / SIH evaluation account only.
========================================================================== */

const DEMO_OFFICER = {
  id: "DEMO-OFFICER-001",
  name: "GeoVista Demo Officer",
  email: "demo.officer@geovista.demo",
  role: "officer",
};

const DEMO_OFFICER_PASSWORD =
  "GeoVista@Demo2026";

/* ==========================================================================
   USERS STORAGE
========================================================================== */

const usersFile = path.resolve(
  process.cwd(),
  "src",
  "data",
  "users.json",
);

/* ==========================================================================
   FILE HELPERS
========================================================================== */

async function ensureUsersFile() {
  await fs.mkdir(
    path.dirname(usersFile),
    {
      recursive: true,
    },
  );

  try {
    await fs.access(usersFile);
  } catch {
    await fs.writeFile(
      usersFile,
      "[]\n",
      "utf8",
    );
  }
}

async function readUsers() {
  await ensureUsersFile();

  try {
    const raw =
      await fs.readFile(
        usersFile,
        "utf8",
      );

    const users =
      JSON.parse(raw);

    if (!Array.isArray(users)) {
      throw new Error(
        "users.json must contain an array.",
      );
    }

    return users;
  } catch (error) {
    if (
      error instanceof
      SyntaxError
    ) {
      throw new Error(
        "users.json contains invalid JSON.",
      );
    }

    throw error;
  }
}

async function writeUsers(
  users,
) {
  await ensureUsersFile();

  await fs.writeFile(
    usersFile,
    `${JSON.stringify(
      users,
      null,
      2,
    )}\n`,
    "utf8",
  );
}

/* ==========================================================================
   NORMALIZATION
========================================================================== */

function normalizeEmail(
  email,
) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/* ==========================================================================
   PUBLIC USER RESPONSE
========================================================================== */

function publicUser(
  user,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt:
      user.createdAt,
  };
}

/* ==========================================================================
   JWT
========================================================================== */

function createToken(
  user,
  options = {},
) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,

      ...(options.isDemo && {
        demo: true,
      }),
    },
    settings.JWT_SECRET,
    {
      expiresIn:
        settings.JWT_EXPIRES_IN,
    },
  );
}

/* ==========================================================================
   EMAIL VALIDATION
========================================================================== */

function validateEmail(
  email,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

/* ==========================================================================
   CREDENTIAL VALIDATION
========================================================================== */

function validateCredentials(
  email,
  password,
) {
  if (
    !validateEmail(email)
  ) {
    return "Enter a valid email address.";
  }

  if (
    !password ||
    typeof password !== "string"
  ) {
    return "Password is required.";
  }

  if (
    password.length < 8
  ) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

/* ==========================================================================
   OFFICIAL OFFICER EMAIL
========================================================================== */

function isOfficialOfficerEmail(
  email,
) {
  const normalizedEmail =
    normalizeEmail(email);

  const parts =
    normalizedEmail.split("@");

  if (parts.length !== 2) {
    return false;
  }

  const domain =
    parts[1];

  return (
    domain === "gov.in" ||
    domain.endsWith(".gov.in") ||
    domain === "nic.in" ||
    domain.endsWith(".nic.in")
  );
}

/* ==========================================================================
   DEMO OFFICER CHECK
========================================================================== */

function isDemoOfficerCredentials(
  email,
  password,
) {
  return (
    normalizeEmail(email) ===
      DEMO_OFFICER.email &&
    password ===
      DEMO_OFFICER_PASSWORD
  );
}

/* ==========================================================================
   USER ID
========================================================================== */

function generateUserId() {
  return `USR-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

/* ==========================================================================
   POST /api/auth/signup
========================================================================== */

router.post(
  "/signup",
  async (req, res, next) => {
    try {
      const {
        name,
        email,
        password,
        role,
        officer_code,
        officerCode,
      } = req.body || {};

      const normalizedEmail =
        normalizeEmail(email);

      const authorizationCode =
        String(
          officer_code ??
            officerCode ??
            "",
        ).trim();

      /* ==============================================================
         NAME
      ============================================================== */

      if (
        !name ||
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          detail:
            "Full name is required.",
        });
      }

      if (
        name.trim().length < 2
      ) {
        return res.status(400).json({
          detail:
            "Full name must contain at least 2 characters.",
        });
      }

      /* ==============================================================
         ROLE
      ============================================================== */

      if (
        !["public", "officer"].includes(
          role,
        )
      ) {
        return res.status(400).json({
          detail:
            "Invalid account role.",
        });
      }

      /* ==============================================================
         EMAIL + PASSWORD
      ============================================================== */

      const credentialError =
        validateCredentials(
          normalizedEmail,
          password,
        );

      if (credentialError) {
        return res.status(400).json({
          detail:
            credentialError,
        });
      }

      /* ==============================================================
         DEMO ACCOUNT CANNOT BE CREATED
      ============================================================== */

      if (
        normalizedEmail ===
        DEMO_OFFICER.email
      ) {
        return res.status(403).json({
          detail:
            "The Demo Officer account is reserved for demonstration login.",
        });
      }

      /* ==============================================================
         OFFICER EMAIL RESTRICTION
      ============================================================== */

      if (
        role === "officer" &&
        !isOfficialOfficerEmail(
          normalizedEmail,
        )
      ) {
        return res.status(403).json({
          detail:
            "Officer Portal registration requires an official government email ending in @gov.in or @nic.in.",
        });
      }

      /* ==============================================================
         OFFICER AUTHORIZATION CODE
      ============================================================== */

      if (
        role === "officer"
      ) {
        if (
          !authorizationCode
        ) {
          return res.status(403).json({
            detail:
              "Officer authorization code is required.",
          });
        }

        if (
          authorizationCode !==
          settings.OFFICER_SIGNUP_CODE
        ) {
          return res.status(403).json({
            detail:
              "Invalid officer authorization code.",
          });
        }
      }

      /* ==============================================================
         READ USERS
      ============================================================== */

      const users =
        await readUsers();

      /* ==============================================================
         DUPLICATE ACCOUNT
      ============================================================== */

      const existingUser =
        users.find(
          (user) =>
            normalizeEmail(
              user.email,
            ) === normalizedEmail,
        );

      if (existingUser) {
        return res.status(409).json({
          detail:
            "An account with this email already exists.",
        });
      }

      /* ==============================================================
         HASH PASSWORD
      ============================================================== */

      const passwordHash =
        await bcrypt.hash(
          password,
          12,
        );

      /* ==============================================================
         CREATE USER
      ============================================================== */

      const user = {
        id: generateUserId(),

        name: name.trim(),

        email:
          normalizedEmail,

        passwordHash,

        role,

        createdAt:
          new Date().toISOString(),
      };

      users.push(user);

      await writeUsers(
        users,
      );

      /* ==============================================================
         JWT
      ============================================================== */

      const token =
        createToken(user);

      return res.status(201).json({
        message:
          "Account created successfully.",

        token,

        user:
          publicUser(user),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ==========================================================================
   POST /api/auth/signin
========================================================================== */

router.post(
  "/signin",
  async (req, res, next) => {
    try {
      const {
        email,
        password,
        role,
      } = req.body || {};

      const normalizedEmail =
        normalizeEmail(email);

      /* ==============================================================
         ROLE
      ============================================================== */

      if (
        !["public", "officer"].includes(
          role,
        )
      ) {
        return res.status(400).json({
          detail:
            "Invalid account role.",
        });
      }

      /* ==============================================================
         BASIC VALIDATION
      ============================================================== */

      const credentialError =
        validateCredentials(
          normalizedEmail,
          password,
        );

      if (credentialError) {
        return res.status(400).json({
          detail:
            credentialError,
        });
      }

      /* ==============================================================
         DEMO OFFICER LOGIN
         This intentionally runs BEFORE the official-email check.
      ============================================================== */

      if (
        role === "officer" &&
        isDemoOfficerCredentials(
          normalizedEmail,
          password,
        )
      ) {
        const token =
          createToken(
            DEMO_OFFICER,
            {
              isDemo: true,
            },
          );

        return res.json({
          message:
            "Demo Officer signed in successfully.",

          token,

          user: {
            ...DEMO_OFFICER,
            createdAt:
              "2026-01-01T00:00:00.000Z",
          },
        });
      }

      /* ==============================================================
         OFFICER EMAIL RESTRICTION
      ============================================================== */

      if (
        role === "officer" &&
        !isOfficialOfficerEmail(
          normalizedEmail,
        )
      ) {
        return res.status(403).json({
          detail:
            "Officer Portal requires an official government email ending in @gov.in or @nic.in.",
        });
      }

      /* ==============================================================
         READ USERS
      ============================================================== */

      const users =
        await readUsers();

      /* ==============================================================
         FIND USER
      ============================================================== */

      const user =
        users.find(
          (item) =>
            normalizeEmail(
              item.email,
            ) === normalizedEmail,
        );

      /* ==============================================================
         USER NOT FOUND
      ============================================================== */

      if (!user) {
        return res.status(401).json({
          detail:
            "Invalid email or password.",
        });
      }

      /* ==============================================================
         PASSWORD
      ============================================================== */

      const passwordValid =
        await bcrypt.compare(
          password,
          user.passwordHash,
        );

      if (!passwordValid) {
        return res.status(401).json({
          detail:
            "Invalid email or password.",
        });
      }

      /* ==============================================================
         ROLE PROTECTION
      ============================================================== */

      if (
        user.role !== role
      ) {
        return res.status(403).json({
          detail:
            user.role ===
            "officer"
              ? "This account belongs to the Officer Portal. Please select Officer Portal."
              : "This account belongs to the Public Portal. Please select Public Portal.",
        });
      }

      /* ==============================================================
         OFFICER SAFETY
      ============================================================== */

      if (
        user.role === "officer" &&
        !isOfficialOfficerEmail(
          user.email,
        )
      ) {
        return res.status(403).json({
          detail:
            "This Officer account does not use an approved government email address.",
        });
      }

      /* ==============================================================
         CREATE JWT
      ============================================================== */

      const token =
        createToken(user);

      return res.json({
        message:
          "Signed in successfully.",

        token,

        user:
          publicUser(user),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ==========================================================================
   GET /api/auth/me
========================================================================== */

router.get(
  "/me",
  async (req, res) => {
    try {
      const authorization =
        req.headers.authorization ||
        "";

      /* ==============================================================
         AUTH HEADER
      ============================================================== */

      if (
        !authorization.startsWith(
          "Bearer ",
        )
      ) {
        return res.status(401).json({
          detail:
            "Authentication required.",
        });
      }

      const token =
        authorization
          .slice(7)
          .trim();

      if (!token) {
        return res.status(401).json({
          detail:
            "Authentication token is missing.",
        });
      }

      /* ==============================================================
         VERIFY JWT
      ============================================================== */

      const payload =
        jwt.verify(
          token,
          settings.JWT_SECRET,
        );

      /* ==============================================================
         DEMO OFFICER SESSION
      ============================================================== */

      if (
        payload.demo === true &&
        payload.sub ===
          DEMO_OFFICER.id
      ) {
        return res.json({
          user: {
            ...DEMO_OFFICER,
            createdAt:
              "2026-01-01T00:00:00.000Z",
          },
        });
      }

      /* ==============================================================
         FIND NORMAL USER
      ============================================================== */

      const users =
        await readUsers();

      const user =
        users.find(
          (item) =>
            item.id ===
            payload.sub,
        );

      if (!user) {
        return res.status(401).json({
          detail:
            "Account no longer exists.",
        });
      }

      /* ==============================================================
         ROLE SAFETY
      ============================================================== */

      if (
        !["public", "officer"].includes(
          user.role,
        )
      ) {
        return res.status(401).json({
          detail:
            "Account role is invalid.",
        });
      }

      /* ==============================================================
         OFFICER EMAIL SAFETY
      ============================================================== */

      if (
        user.role === "officer" &&
        !isOfficialOfficerEmail(
          user.email,
        )
      ) {
        return res.status(403).json({
          detail:
            "This Officer account does not use an approved government email address.",
        });
      }

      /* ==============================================================
         RESPONSE
      ============================================================== */

      return res.json({
        user:
          publicUser(user),
      });
    } catch (error) {
      /* ==============================================================
         EXPIRED TOKEN
      ============================================================== */

      if (
        error?.name ===
        "TokenExpiredError"
      ) {
        return res.status(401).json({
          detail:
            "Session has expired. Please sign in again.",
        });
      }

      /* ==============================================================
         INVALID TOKEN
      ============================================================== */

      if (
        error?.name ===
        "JsonWebTokenError"
      ) {
        return res.status(401).json({
          detail:
            "Invalid authentication token.",
        });
      }

      /* ==============================================================
         OTHER ERROR
      ============================================================== */

      console.error(
        "Auth /me error:",
        error,
      );

      return res.status(401).json({
        detail:
          "Authentication failed.",
      });
    }
  },
);

/* ==========================================================================
   EXPORT
========================================================================== */

export default router;