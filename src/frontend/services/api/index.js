import Axios from 'axios';

const api = Axios.create({
    baseURL: 'http://localhost:3000',
})

export default api;

export function legacyMediaUrl(value) {
    return typeof value === 'string' && /^\/(kidPhoto|activityImage)\//.test(value)
        ? new URL(value, api.defaults.baseURL).href
        : value;
}
