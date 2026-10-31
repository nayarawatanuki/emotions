import Axios from 'axios';

export const apiUrl = 'http://localhost:3000';

const api = Axios.create({
    baseURL: apiUrl,
})

export default api;