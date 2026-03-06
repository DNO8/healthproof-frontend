import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

type TokenGetter = () => Promise<string | null>;

let _getAccessToken: TokenGetter = async () => null;

export function setTokenGetter(getter: TokenGetter) {
  _getAccessToken = getter;
}

export function setupInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await _getAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;

      if (status === 401) {
        window.location.href = "/auth";
      }

      return Promise.reject(error);
    },
  );
}
