import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { mockBackend } from './mockBackend';
import { ApiClientLike } from '../services/apiClientTypes';

/**
 * Drop-in replacement for ApiClient that routes requests to the in-memory mock backend.
 * Used when MOCK_MODE=true so the bot can run without external dependencies.
 */
export class MockApiClient implements ApiClientLike {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const data = await mockBackend.handleRequest<T>('get', url, undefined, config);
    return this.buildResponse(data, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const result = await mockBackend.handleRequest<T>('post', url, data, config);
    return this.buildResponse(result, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const result = await mockBackend.handleRequest<T>('put', url, data, config);
    return this.buildResponse(result, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const result = await mockBackend.handleRequest<T>('patch', url, data, config);
    return this.buildResponse(result, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const result = await mockBackend.handleRequest<T>('delete', url, undefined, config);
    return this.buildResponse(result, config);
  }

  getCircuitBreakerStats() {
    return {
      mode: 'mock',
      backend: mockBackend.getStats(),
    };
  }

  resetCircuitBreakers() {
    mockBackend.reset();
  }

  private buildResponse<T>(data: T, config?: AxiosRequestConfig): AxiosResponse<T> {
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: (config || {}) as any,
    };
  }
}

