const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { isUuid } = require('../utils/validators');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

async function getPasswordColumn() {
    const result = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
                     AND column_name IN ('password_hash', 'hashed_password', 'plain_password', 'password')`
    );

    const available = new Set(result.rows.map((row) => row.column_name));

    if (available.has('password_hash')) return 'password_hash';
    if (available.has('hashed_password')) return 'hashed_password';
    if (available.has('plain_password')) return 'plain_password';
    if (available.has('password')) return 'password';

    return null;
}

async function isPasswordMatch(storedPassword, plainPassword) {
    if (!storedPassword) return false;

    // Supports legacy plaintext rows while preferring bcrypt hashes.
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
        return bcrypt.compare(plainPassword, storedPassword);
    }

    return storedPassword === plainPassword;
}

const signUpUser = async (req, res, next) => {
    try {
        const { email, phone, plain_password, role } = req.body;
        if (role !== 'patient' && role !== 'doctor') {
            return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid role');
        }
        if (!email || !phone || !plain_password) {
            return errorResponse(res, 400, 'BAD_REQUEST', 'Missing required fields');
        }
        const hashed_password = await bcrypt.hash(plain_password, 12);
        const checkUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR phone = $2',
            [email, phone]
        );

        if (checkUser.rowCount > 0) {
            return errorResponse(res, 409, 'CONFLICT', 'User already exists');
        }

        const passwordColumn = await getPasswordColumn();
        if (!passwordColumn) {
            return errorResponse(res, 500, 'INTERNAL_ERROR', 'No supported password column found in users table');
        }

        const result = await pool.query(
            `INSERT INTO users (email, phone, ${passwordColumn}, role) VALUES ($1, $2, $3, $4) RETURNING email, phone, role`,
            [email, phone, hashed_password, role]
        );

        if (result.rowCount === 0) {
            return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create user');
        }

        return successResponse(res, 201, result.rows[0], 'User created successfully');
    } catch (error) {
        if (error.code === '23505') {
            return errorResponse(res, 409, 'CONFLICT', 'Email or phone already registered');
        }
        return next(error);
    }
};

const userLogin = async (req, res, next) => {
    try {
        const { email, phone, role, plain_password } = req.body;

        if (!role || !plain_password || (!email && !phone)) {
            return errorResponse(res, 400, 'BAD_REQUEST', 'Fill all required fields: role, plain_password and (email or phone)');
        }

        if (!['patient', 'doctor', 'admin'].includes(role)) {
            return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid role');
        }

        const passwordColumn = await getPasswordColumn();
        if (!passwordColumn) {
            return errorResponse(res, 500, 'INTERNAL_ERROR', 'No supported password column found in users table');
        }

        const userResult = await pool.query(
            `SELECT id, ${passwordColumn} AS stored_password FROM users
             WHERE role = $1 AND (email = $2 OR phone = $3)`,
            [role, email || null, phone || null]
        );

        if (userResult.rowCount === 0) {
            return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
        }

        const user = userResult.rows[0];
        const passwordMatch = await isPasswordMatch(user.stored_password, plain_password);
        if (!passwordMatch) {
            return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
        }

        const payload = {
            userId: user.id,
            role,
            email: email || null,
            phone: phone || null,
        };

        const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });

        return successResponse(res, 200, { token }, 'Login successful');
    } catch (error) {
        return next(error);
    }
};

const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid user ID format');
        }

        const result = await pool.query(
            'SELECT id, email, phone, role, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
        }

        return successResponse(res, 200, result.rows[0], 'User retrieved successfully');
    } catch (error) {
        return next(error);
    }
};

const getAllUsers = async (req, res, next) => {
    try {
        const { role } = req.query; // Optional filter by role
        let query = 'SELECT id, email, phone, role, created_at FROM users';
        const params = [];

        if (role) {
            if (role !== 'patient' && role !== 'doctor' && role !== 'admin') {
                return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid role');
            }
            query += ' WHERE role = $1';
            params.push(role);
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);

        return successResponse(res, 200, result.rows, 'Users retrieved successfully');
    } catch (error) {
        return next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, phone, plain_password } = req.body;

        if (!isUuid(id)) {
            return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid user ID format');
        }

        const checkUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
        if (checkUser.rowCount === 0) {
            return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
        }

        let updateQuery = 'UPDATE users SET ';
        const params = [];
        let paramCount = 1;

        if (email) {
            updateQuery += `email = $${paramCount}, `;
            params.push(email);
            paramCount++;
        }

        if (phone) {
            updateQuery += `phone = $${paramCount}, `;
            params.push(phone);
            paramCount++;
        }

        if (plain_password) {
            const passwordColumn = await getPasswordColumn();
            if (!passwordColumn) {
                return errorResponse(res, 500, 'INTERNAL_ERROR', 'No supported password column found in users table');
            }
            const hashed_password = await bcrypt.hash(plain_password, 12);
            updateQuery += `${passwordColumn} = $${paramCount}, `;
            params.push(hashed_password);
            paramCount++;
        }

        if (params.length === 0) {
            return errorResponse(res, 400, 'BAD_REQUEST', 'No fields to update');
        }

        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ` WHERE id = $${paramCount} RETURNING id, email, phone, role, created_at`;
        params.push(id);

        const result = await pool.query(updateQuery, params);

        return successResponse(res, 200, result.rows[0], 'User updated successfully');
    } catch (error) {
        if (error.code === '23505') {
            return errorResponse(res, 409, 'CONFLICT', 'Email or phone already registered');
        }
        return next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid user ID format');
        }

        const checkUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
        if (checkUser.rowCount === 0) {
            return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        return successResponse(res, 200, { id }, 'User deleted successfully');
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    signUpUser,
    userLogin,
    getUserById,
    getAllUsers,
    updateUser,
    deleteUser
};