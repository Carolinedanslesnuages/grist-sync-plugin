/**
 * REST API Provider for data synchronization
 */

import type { SourceProvider, SourceConfig } from '../types';

/**
 * REST API provider implementation
 */
export class RestProvider implements SourceProvider {
  private config: SourceConfig;

  constructor(config: SourceConfig) {
    this.config = config;
  }

  /**
   * Fetch data from REST API
   */
  async fetchData(): Promise<any[]> {
    const url = this.config.url;
    if (!url) {
      throw new Error('REST provider requires a URL');
    }

    const method = this.config.method || 'GET';
    const headers = this.expandEnvVars(this.config.headers || {});

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // If dataPath is specified, navigate to that path in the response
      if (this.config.dataPath) {
        return this.getDataAtPath(data, this.config.dataPath);
      }

      // If data is an array, return it directly
      if (Array.isArray(data)) {
        return data;
      }

      // If data is an object, look for common array properties
      if (typeof data === 'object' && data !== null) {
        for (const key of ['data', 'items', 'results', 'records']) {
          if (Array.isArray(data[key])) {
            return data[key];
          }
        }
      }

      throw new Error('Unable to extract array data from response');
    } catch (error) {
      throw new Error(`Failed to fetch data from REST API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test connection to REST API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchData();
      return true;
    } catch (error) {
      console.error('REST connection test failed:', error);
      return false;
    }
  }

  /**
   * Expand environment variables in strings
   */
  private expandEnvVars(obj: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return process.env[varName] || '';
      });
    }
    return result;
  }

  /**
   * Get data at a specific path in an object
   */
  private getDataAtPath(obj: any, path: string): any[] {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        throw new Error(`Path '${path}' not found in response`);
      }
      current = current[part];
    }

    if (!Array.isArray(current)) {
      throw new Error(`Data at path '${path}' is not an array`);
    }

    return current;
  }
}

/**
 * Mock provider for testing
 */
export class MockProvider implements SourceProvider {
  private mockData: any[];

  constructor(mockData: any[] = []) {
    this.mockData = mockData;
  }

  async fetchData(): Promise<any[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.mockData;
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}
