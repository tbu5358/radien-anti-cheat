import { AxiosRequestConfig, AxiosResponse } from 'axios';
export interface ApiClientLike {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    getCircuitBreakerStats(): unknown;
    resetCircuitBreakers(): void;
}
//# sourceMappingURL=apiClientTypes.d.ts.map