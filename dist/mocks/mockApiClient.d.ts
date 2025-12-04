import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiClientLike } from '../services/apiClientTypes';
/**
 * Drop-in replacement for ApiClient that routes requests to the in-memory mock backend.
 * Used when MOCK_MODE=true so the bot can run without external dependencies.
 */
export declare class MockApiClient implements ApiClientLike {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    getCircuitBreakerStats(): {
        mode: string;
        backend: {
            cases: number;
            audits: number;
            moderationAudits: number;
        };
    };
    resetCircuitBreakers(): void;
    private buildResponse;
}
//# sourceMappingURL=mockApiClient.d.ts.map