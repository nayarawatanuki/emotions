const { argon2, randomBytes, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const deriveKey = promisify(argon2);
const prefix = '$argon2id$v=19$m=65536,t=3,p=1$';

function usablePassword(password) {
    return typeof password === 'string' && password.length > 0 &&
        Buffer.byteLength(password, 'utf8') <= 1024;
}

async function derive(password, salt) {
    const message = Buffer.from(password, 'utf8');
    try {
        return await deriveKey('argon2id', {
            message, nonce: salt, memory: 65536, passes: 3, parallelism: 1, tagLength: 32
        });
    } finally {
        message.fill(0);
    }
}

async function hashPassword(password) {
    if (!usablePassword(password)) throw new TypeError('Invalid password');
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    try {
        return prefix + salt.toString('base64url') + '$' + key.toString('base64url');
    } finally {
        key.fill(0);
    }
}

async function verifyPassword(password, encoded) {
    if (!usablePassword(password) || typeof encoded !== 'string' || !encoded.startsWith(prefix)) return false;
    const fields = encoded.slice(prefix.length).split('$');
    if (fields.length !== 2 || !/^[A-Za-z0-9_-]{22}$/.test(fields[0]) ||
        !/^[A-Za-z0-9_-]{43}$/.test(fields[1])) return false;
    const expected = Buffer.from(fields[1], 'base64url');
    const actual = await derive(password, Buffer.from(fields[0], 'base64url'));
    try {
        return timingSafeEqual(actual, expected);
    } finally {
        actual.fill(0);
        expected.fill(0);
    }
}

module.exports = { hashPassword, verifyPassword, usablePassword };
