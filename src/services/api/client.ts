import axios from "axios";
import { env } from "@/lib/env";
import { setupInterceptors } from "./interceptors";

export const apiClient = axios.create({
  baseURL: env.BACKEND_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

setupInterceptors(apiClient);
