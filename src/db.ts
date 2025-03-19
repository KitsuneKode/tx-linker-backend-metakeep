import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define interfaces
interface PageLoad {
  eventType: string;
  timeKey: string;
  count: number;
  lastUpdated: Date;
}

interface PageLoadDetail {
  eventType: string;
  timeKey: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  eventData: any;
}

interface AnalyticsEvent {
  eventType: string;
  timeKey: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  eventData: any;
}

// Define mongoose schemas
const pageLoadSchema = new mongoose.Schema<PageLoad>({
  eventType: { type: String, required: true },
  timeKey: { type: String, required: true },
  count: { type: Number, required: true, default: 1 },
  lastUpdated: { type: Date, required: true, default: Date.now },
});

const pageLoadDetailSchema = new mongoose.Schema<PageLoadDetail>({
  eventType: { type: String, required: true },
  timeKey: { type: String, required: true },
  timestamp: { type: Date, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  referrer: { type: String },
  eventData: { type: mongoose.Schema.Types.Mixed },
});

const analyticsEventSchema = new mongoose.Schema<AnalyticsEvent>({
  eventType: { type: String, required: true },
  timeKey: { type: String, required: true },
  timestamp: { type: Date, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  referrer: { type: String },
  eventData: { type: mongoose.Schema.Types.Mixed },
});

// Create compound index for efficient queries
pageLoadSchema.index({ eventType: 1, timeKey: 1 }, { unique: true });
pageLoadDetailSchema.index({ eventType: 1, timeKey: 1 });
analyticsEventSchema.index({ eventType: 1, timeKey: 1 });

// Define models
export const PageLoadModel = mongoose.model<PageLoad>(
  'PageLoad',
  pageLoadSchema
);
export const PageLoadDetailModel = mongoose.model<PageLoadDetail>(
  'PageLoadDetail',
  pageLoadDetailSchema
);
export const AnalyticsEventModel = mongoose.model<AnalyticsEvent>(
  'AnalyticsEvent',
  analyticsEventSchema
);

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to database');
  } catch (error) {
    console.error('Failed to connect to database.\n', error);
    process.exit(1);
  }
};
