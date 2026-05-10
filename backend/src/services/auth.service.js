const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../../db/connection");

async function register(data) {
  const {
    name,
    email,
    password,
    role
  } = data;

  if (!name || !email || !password) {
    throw new Error("name, email and password are required");
  }

  const existingUser = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error("Email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at`,
    [
      name,
      email,
      passwordHash,
      role || "STAFF"
    ]
  );

  return result.rows[0];
}

async function login(data) {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error("email and password are required");
  }

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];

  const passwordMatch = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatch) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h"
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

module.exports = {
  register,
  login
};