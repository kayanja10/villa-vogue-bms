const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { prisma } = require("../prisma");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not configured.");
}

/**
 * Create access token
 */
function createAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );
}

/**
 * Create refresh token
 */
function createRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

/**
 * POST /login
 *
 * Accepts:
 * {
 *   username: "admin",
 *   password: "your-password"
 * }
 *
 * OR:
 *
 * {
 *   username: "admin@villavoguefashion.com",
 *   password: "your-password"
 * }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password required",
      });
    }

    const loginIdentifier = String(username).trim();

    /**
     * Find user using either username or email.
     *
     * This requires the User model to contain:
     *
     * username String @unique
     * email    String @unique
     */
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: loginIdentifier,
          },
          {
            email: loginIdentifier,
          },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    /**
     * Prevent inactive users from logging in.
     */
    if (!user.isActive) {
      return res.status(403).json({
        error: "Your account is inactive. Please contact the administrator.",
      });
    }

    /**
     * Compare supplied password with hashed password.
     */
    const passwordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordValid) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    /**
     * Generate tokens.
     */
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    /**
     * Return safe user information.
     *
     * Never return the password.
     */
    const safeUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
    };

    return res.json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Login failed",
      message:
        process.env.NODE_ENV === "production"
          ? "An internal server error occurred."
          : error.message,
    });
  }
});


/**
 * POST /refresh
 *
 * Generates a new access token using a valid refresh token.
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token required",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        refreshToken,
        JWT_REFRESH_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        error: "Invalid or expired refresh token",
      });
    }

    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        error: "Invalid refresh token",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "User no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "User account is inactive",
      });
    }

    const accessToken = createAccessToken(user);

    return res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      error: "Unable to refresh session",
    });
  }
});


/**
 * GET /me
 *
 * Returns the currently authenticated user.
 *
 * This route expects:
 *
 * Authorization: Bearer ACCESS_TOKEN
 */
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authorization token required",
      });
    }

    const token = authHeader.substring(7);

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: "Invalid or expired access token",
      });
    }

    const userId = decoded.userId || decoded.id;

    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "User account is inactive",
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      error: "Unable to retrieve user",
    });
  }
});


/**
 * POST /logout
 *
 * The frontend should remove the access and refresh tokens.
 */
router.post("/logout", async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      error: "Logout failed",
    });
  }
});


module.exports = router;

