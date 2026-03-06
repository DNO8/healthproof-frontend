import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { createClient } from "@/lib/supabase/client";

export function setupInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }

      return config;
    },
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;

      if (status === 401) {
        const supabase = createClient();
        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          await supabase.auth.signOut();
          window.location.href = "/auth";
        }
      }

      return Promise.reject(error);
    },
  );
}
