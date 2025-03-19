import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  AnalyticsEventModel,
  connectDB,
  PageLoadDetailModel,
  PageLoadModel,
} from './db';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Error handler middleware
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, error: err.message });
};

// API Routes
// Record page load event
app.post(
  '/api/analytics/pageload',
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(
      `[${new Date().toISOString()}] POST /api/analytics/pageload - Request received`
    );
    console.log('Request Body:', req.body);

    try {
      const timestamp = new Date();
      const minuteKey = timestamp.toISOString().substring(0, 16) + '0:00'; // Round to minute

      console.log(
        `[${new Date().toISOString()}] Updating page load count for minuteKey: ${minuteKey}`
      );

      // Update or create the page load count document
      await PageLoadModel.findOneAndUpdate(
        {
          eventType: 'pageLoad',
          timeKey: minuteKey,
        },
        {
          $inc: { count: 1 },
          $set: { lastUpdated: timestamp },
        },
        {
          upsert: true,
        }
      );

      console.log(
        `[${new Date().toISOString()}] Logging detailed page load event`
      );

      // Also log detailed event
      await PageLoadDetailModel.create({
        eventType: 'pageLoadDetail',
        timeKey: `${minuteKey}#${uuidv4()}`,
        timestamp: timestamp,
        userAgent: req.headers['user-agent'] || 'Unknown',
        ipAddress: req.ip,
        referrer: req.headers.referer || 'Direct',
        eventData: req.body,
      });

      console.log(
        `[${new Date().toISOString()}] Page load event successfully recorded`
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in /api/analytics/pageload:`,
        error
      );
      next(error);
    }
  }
);

// Record general analytics event
app.post(
  '/api/analytics/event',
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(
      `[${new Date().toISOString()}] POST /api/analytics/event - Request received`
    );
    console.log('Request Body:', req.body);

    try {
      const { event, data } = req.body;
      const timestamp = new Date();

      console.log(
        `[${new Date().toISOString()}] Logging analytics event: ${event}`
      );

      await AnalyticsEventModel.create({
        eventType: `event_${event}`,
        timeKey: `${timestamp.toISOString()}#${uuidv4()}`,
        timestamp: timestamp,
        userAgent: req.headers['user-agent'] || 'Unknown',
        ipAddress: req.ip,
        referrer: req.headers.referer || 'Direct',
        eventData: data,
      });

      console.log(
        `[${new Date().toISOString()}] Analytics event successfully recorded`
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in /api/analytics/event:`,
        error
      );
      next(error);
    }
  }
);

// Get page loads per minute (last 60 minutes)
app.get(
  '/api/analytics/pageloads',
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(
      `[${new Date().toISOString()}] GET /api/analytics/pageloads - Request received`
    );

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 60 minutes ago

      const startTimeKey = startTime.toISOString().substring(0, 16) + '0:00';
      const endTimeKey = endTime.toISOString().substring(0, 16) + '0:00';

      console.log(
        `[${new Date().toISOString()}] Querying page loads from ${startTimeKey} to ${endTimeKey}`
      );

      const result = await PageLoadModel.find({
        eventType: 'pageLoad',
        timeKey: { $gte: startTimeKey, $lte: endTimeKey },
      })
        .sort({ timeKey: 1 })
        .exec();

      console.log(
        `[${new Date().toISOString()}] Page load query result:`,
        result
      );

      const pageLoads = [];
      for (let i = 0; i < 60; i++) {
        const minuteTime = new Date(endTime.getTime() - i * 60 * 1000);
        const minuteKey = minuteTime.toISOString().substring(0, 16) + '0:00';

        const existingRecord = result.find(
          (item) => item.timeKey === minuteKey
        );

        pageLoads.unshift({
          timeKey: minuteKey,
          displayTime: minuteTime.toLocaleTimeString(),
          count: existingRecord ? existingRecord.count : 0,
        });
      }

      console.log(`[${new Date().toISOString()}] Returning page load data`);
      res.status(200).json(pageLoads);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in /api/analytics/pageloads:`,
        error
      );
      next(error);
    }
  }
);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  console.log(
    `[${new Date().toISOString()}] GET /api/health - Request received`
  );
  res.status(200).json({
    status: 'healthy',
    mongodb:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Apply error handler
app.use(errorHandler);

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close()
      .then(() => {
        console.log('Server and database connections closed.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error closing database connection:', err);
        process.exit(1);
      });
  });
});

export default app;
