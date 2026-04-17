import httpClient from "./httpClient";

const adminApi = {
  async getUsers() {
    const response = await httpClient.get("/admin/users");
    return response.data;
  },

  async addUser(userData) {
    const response = await httpClient.post("/admin/users", userData);
    return response.data;
  },

  async updateUser(id, userData) {
    const response = await httpClient.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  async deleteUser(id) {
    const response = await httpClient.delete(`/admin/users/${id}`);
    return response.data;
  },
};

export default adminApi;
