const { randomBytes } = require('node:crypto');
const Task = require('../models/Task');
const Kid = require('../models/Kid');
const Reward = require('../models/Reward');

const production = process.env.NODE_ENV === 'production';
const origin = process.env.LEGACY_FRONTEND_ORIGIN || (!production && 'http://localhost:3000');
const cookieName = production ? '__Host-emotions_legacy' : 'emotions_legacy';
const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/' };
const lifetime = 60 * 60 * 1000;
const loginWindow = 15 * 60 * 1000;
const sessions = new Map();
const attempts = new Map();

function prune(entries, now) {
    for (const [key, value] of entries) {
        if (value.expires <= now) entries.delete(key);
    }
}

function cookieToken(req) {
    const cookies = (req.headers.cookie || '').split(';');
    return cookies.map(value => value.trim()).find(value => value.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
}

function requestOrigin(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || (origin && req.get('origin') === origin)) {
        return next();
    }
    return res.sendStatus(403);
}

function limitLogin(req, res, next) {
    const now = Date.now();
    prune(attempts, now);
    const key = req.ip;
    let state = attempts.get(key);
    if (!state) {
        if (attempts.size >= 4096) return res.sendStatus(429);
        state = { count: 0, expires: now + loginWindow };
        attempts.set(key, state);
    }
    if (state.count >= 10) {
        res.set('Retry-After', String(Math.ceil((state.expires - now) / 1000)));
        return res.sendStatus(429);
    }
    state.count++;
    return next();
}

function startSession(req, res, role, id) {
    const now = Date.now();
    prune(sessions, now);
    sessions.delete(cookieToken(req));
    if (sessions.size >= 4096) return res.sendStatus(503);
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { role, id, expires: now + lifetime });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime });
    res.set('Cache-Control', 'no-store');
    return res.json(id);
}

function endSession(req, res) {
    sessions.delete(cookieToken(req));
    res.clearCookie(cookieName, cookieOptions);
    return res.sendStatus(204);
}

function authenticated(req, res, next) {
    const token = cookieToken(req);
    const session = sessions.get(token);
    if (!session || session.expires <= Date.now()) {
        sessions.delete(token);
        return res.sendStatus(401);
    }
    req.legacySession = session;
    res.set('Cache-Control', 'no-store');
    return next();
}

function professional(req, res, next) {
    return req.legacySession.role === 'professional' ? next() : res.sendStatus(403);
}

function ownChild(req, res, next) {
    const { id, role } = req.legacySession;
    return role === 'professional' || String(id) === req.params.kid_id ? next() : res.sendStatus(403);
}

async function ownTask(req, res, next) {
    const { id, role } = req.legacySession;
    if (role === 'professional' && req.method !== 'POST') return next();
    if (role !== 'child') return res.sendStatus(403);
    try {
        const task = await Task.findOne({ where: { id: req.params.task_id, kid_id: id }, attributes: ['id'] });
        return task ? next() : res.sendStatus(404);
    } catch (error) {
        return next(error);
    }
}

async function ownMedia(req, res, next) {
    const { id, role } = req.legacySession;
    if (role === 'professional') return next();
    try {
        const mediaPath = req.baseUrl + req.path;
        if (req.baseUrl === '/kidPhoto') {
            const photo = await Kid.findOne({ where: { id, photo: mediaPath }, attributes: ['id'] });
            return photo ? next() : res.sendStatus(404);
        }
        const activity = await Task.findOne({ where: { kid_id: id, image: mediaPath }, attributes: ['id'] });
        if (activity) return next();
        const reward = await Reward.findOne({
            where: { photo: mediaPath },
            attributes: ['id'],
            include: { model: Task, as: 'tasks', where: { kid_id: id }, attributes: [] }
        });
        return reward ? next() : res.sendStatus(404);
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    origin, requestOrigin, limitLogin, startSession, endSession,
    authenticated, professional, ownChild, ownTask, ownMedia
};
