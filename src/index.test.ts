// src/index.test.ts
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Server } from 'http';
import mongoose from 'mongoose';
import app from './index';
import { 
  PageLoadModel, 
  PageLoadDetailModel, 
  AnalyticsEventModel,
  connectDB
} from './db';

// Define response types
type SuccessResponse = {
  success: true;
};

type ErrorResponse = {
  success: false;
  error: string;
};

type PageLoadResponse = Array<{
  timeKey: string;
  displayTime: string;
  count: number;
}>;

// Mock console methods to suppress expected error logs during testing
const originalConsoleError = console.error;
const mockConsoleError = mock(() => {});

// Mock mongoose models
const mockFind = mock(() => ({
  sort: () => ({
    exec: () => Promise.resolve([])
  })
}));

const mockFindOneAndUpdate = mock(() => Promise.resolve({}));
const mockCreate = mock(() => Promise.resolve({}));

// Mock the models
mock.module('./db', () => ({
  connectDB: mock(() => Promise.resolve()),
  PageLoadModel: {
    find: mockFind,
    findOneAndUpdate: mockFindOneAndUpdate,
    sort: mock(() => ({
      exec: () => Promise.resolve([])
    })),
  },
  PageLoadDetailModel: {
    create: mockCreate,
  },
  AnalyticsEventModel: {
    create: mockCreate,
  },
}));

describe('Analytics API Server', () => {
  let server: Server;
  const testPort = 3002;

  beforeAll(async () => {
    // Start server once for all tests
    server = app.listen(testPort);
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(() => {
    // Reset all mocks before each test
    mockFind.mockClear();
    mockFindOneAndUpdate.mockClear();
    mockCreate.mockClear();
    mockConsoleError.mockClear();
    
    // Suppress error logs for error test cases
    console.error = mockConsoleError;
  });

  afterEach(() => {
    // Reset mongoose connection state after each test
    if ('readyState' in mongoose.connection) {
      delete (mongoose.connection as { readyState?: number }).readyState;
    }
    
    // Restore console.error
    console.error = originalConsoleError;
  });

  afterAll(async () => {
    // Proper cleanup
    return new Promise<void>((resolve) => {
      server.close(() => {
        mongoose.connection.close()
          .then(() => resolve())
          .catch(() => resolve()); // Still resolve if mongoose connection fails
      });
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      // Mock mongoose connection state
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => 1,
        configurable: true
      });

      const response = await fetch(`http://localhost:${testPort}/api/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        mongodb: 'connected',
      });
    });

    test('should return disconnected status when mongoose is not connected', async () => {
      // Mock mongoose connection state
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => 0,
        configurable: true
      });

      const response = await fetch(`http://localhost:${testPort}/api/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        mongodb: 'disconnected',
      });
    });
  });

  describe('POST /api/analytics/pageload', () => {
    test('should record page load events', async () => {
      const mockData = {
        url: 'https://example.com',
        title: 'Example Page'
      };

      const response = await fetch(`http://localhost:${testPort}/api/analytics/pageload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });
      const data = await response.json() as SuccessResponse;

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      
      // Verify mock calls
      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    test('should handle errors during page load recording', async () => {
      // Mock error
      mockFindOneAndUpdate.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const mockData = { url: 'https://example.com' };
      
      const response = await fetch(`http://localhost:${testPort}/api/analytics/pageload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Database error',
      });
    });
  });

  describe('POST /api/analytics/event', () => {
    test('should record analytics events', async () => {
      const mockEventData = {
        event: 'button_click',
        data: {
          buttonId: 'submit-form',
          pageSection: 'contact-form'
        }
      };

      const response = await fetch(`http://localhost:${testPort}/api/analytics/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockEventData),
      });
      const data = await response.json() as SuccessResponse;

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      
      // Verify mock call
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    test('should handle errors during event recording', async () => {
      // Mock error
      mockCreate.mockImplementationOnce(() => {
        throw new Error('Event recording failed');
      });

      const mockEventData = { event: 'error_test', data: {} };
      
      const response = await fetch(`http://localhost:${testPort}/api/analytics/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockEventData),
      });
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Event recording failed',
      });
    });
  });

  describe('GET /api/analytics/pageloads', () => {
    test('should return page loads for the last 60 minutes', async () => {
      // Create mock data with timestamps in the last hour
      const now = new Date();
      const mockData = [
        {
          timeKey: new Date(now.getTime() - 20 * 60000).toISOString().substring(0, 16) + '0:00',
          count: 5,
          eventType: 'pageLoad',
          lastUpdated: now
        },
        {
          timeKey: new Date(now.getTime() - 10 * 60000).toISOString().substring(0, 16) + '0:00',
          count: 8,
          eventType: 'pageLoad',
          lastUpdated: now
        },
        {
          timeKey: new Date(now.getTime() - 5 * 60000).toISOString().substring(0, 16) + '0:00',
          count: 3,
          eventType: 'pageLoad',
          lastUpdated: now
        }
      ];
      
      // Setup mock implementation
      mockFind.mockImplementationOnce(() => ({
        sort: () => ({
          exec: () => Promise.resolve(mockData)
        })
      }));

      const response = await fetch(`http://localhost:${testPort}/api/analytics/pageloads`);
      const data = await response.json() as PageLoadResponse;
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(60); // Should return 60 minute slots
      
      // Verify some of the returned data matches our mock data
      const matchingEntries = data.filter((entry) => 
        mockData.some(mockEntry => mockEntry.timeKey === entry.timeKey)
      );
      expect(matchingEntries.length).toBeGreaterThan(0);
      
      // Verify the mock was called with correct time range
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'pageLoad',
          timeKey: expect.objectContaining({
            $gte: expect.any(String),
            $lte: expect.any(String)
          })
        })
      );
    });

    test('should handle errors during page load retrieval', async () => {
      // Setup mock to throw error
      mockFind.mockImplementationOnce(() => ({
        sort: () => ({
          exec: () => Promise.reject(new Error('Database query failed'))
        })
      }));

      const response = await fetch(`http://localhost:${testPort}/api/analytics/pageloads`);
      const data = await response.json() as ErrorResponse;
      
      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Database query failed',
      });
    });
  });
});