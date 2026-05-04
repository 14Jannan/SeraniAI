import httpClient from "./httpClient";

const journalApi = {
  async getJournals() {
    const response = await httpClient.get("/journals");
    return response.data;
  },

  async getJournalSummary(moodRange = "week", insightRange = "week") {
    const response = await httpClient.get("/journals/stats/summary", {
      params: { moodRange, insightRange },
    });
    return response.data;
  },

  async getJournalById(id) {
    const response = await httpClient.get(`/journals/${id}`);
    return response.data;
  },

  async createJournal(payload) {
    const response = await httpClient.post("/journals", payload);
    return response.data;
  },

  async updateJournal(id, payload) {
    const response = await httpClient.put(`/journals/${id}`, payload);
    return response.data;
  },

  async deleteJournal(id) {
    const response = await httpClient.delete(`/journals/${id}`);
    return response.data;
  },

  async refreshInsight(id) {
    const response = await httpClient.post(`/journals/${id}/refresh-insight`);
    return response.data;
  },
};

export default journalApi;