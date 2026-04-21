import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/adminApi";

export const useFetchUSers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      return await getUsers();
    },
  });
};
