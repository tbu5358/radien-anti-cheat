"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockApiClient = void 0;
const mockBackend_1 = require("./mockBackend");
/**
 * Drop-in replacement for ApiClient that routes requests to the in-memory mock backend.
 * Used when MOCK_MODE=true so the bot can run without external dependencies.
 */
class MockApiClient {
    async get(url, config) {
        const data = await mockBackend_1.mockBackend.handleRequest('get', url, undefined, config);
        return this.buildResponse(data, config);
    }
    async post(url, data, config) {
        const result = await mockBackend_1.mockBackend.handleRequest('post', url, data, config);
        return this.buildResponse(result, config);
    }
    async put(url, data, config) {
        const result = await mockBackend_1.mockBackend.handleRequest('put', url, data, config);
        return this.buildResponse(result, config);
    }
    async patch(url, data, config) {
        const result = await mockBackend_1.mockBackend.handleRequest('patch', url, data, config);
        return this.buildResponse(result, config);
    }
    async delete(url, config) {
        const result = await mockBackend_1.mockBackend.handleRequest('delete', url, undefined, config);
        return this.buildResponse(result, config);
    }
    getCircuitBreakerStats() {
        return {
            mode: 'mock',
            backend: mockBackend_1.mockBackend.getStats(),
        };
    }
    resetCircuitBreakers() {
        mockBackend_1.mockBackend.reset();
    }
    buildResponse(data, config) {
        return {
            data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: (config || {}),
        };
    }
}
exports.MockApiClient = MockApiClient;
//# sourceMappingURL=mockApiClient.js.map