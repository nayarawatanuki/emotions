import Axios from 'axios';

const api = Axios.create({
    baseURL: process.env.REACT_APP_LEGACY_API_URL || 'http://localhost:3000',
    withCredentials: true,
})

export function legacyMediaUrl(value) {
    return typeof value === 'string' && /^\/(kidPhoto|taskImage)\//.test(value)
        ? new URL(value, api.defaults.baseURL).href
        : value;
}

export default api;