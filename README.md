# TxLinker Analytics Backend

A robust backend service for tracking and visualizing page loads per minute for transaction signing pages. Built with Express.js, TypeScript, and MongoDB, this service provides real-time analytics and monitoring capabilities.

## Features

- Real-time page load tracking
- Per-minute analytics aggregation
- MongoDB integration for data persistence
- RESTful API endpoints
- CORS enabled for cross-origin requests
- TypeScript for type safety
- Environment variable configuration

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Bun runtime (for development)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend-tx-linker
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
```

## Development

To start the development server with hot-reload:
```bash
bun run dev
```

## Production

To start the production server:
```bash
bun run start
```

## API Endpoints

### POST /api/analytics/pageload
Records a page load event.

Request body:
```json
{
  "pageId": "string",
  "userId": "string",
  "timestamp": "ISO date string"
}
```

### GET /api/analytics/pageloads
Retrieves aggregated page load data.

Query parameters:
- `startTime`: Start timestamp (ISO date string)
- `endTime`: End timestamp (ISO date string)
- `pageId`: Filter by specific page ID

## Project Structure

```
backend-tx-linker/
├── src/
│   ├── index.ts        # Main application entry point
│   ├── db.ts          # Database configuration and models
│   └── types.ts       # TypeScript type definitions
├── package.json       # Project dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── .env              # Environment variables
```

## Technologies Used

- Express.js
- TypeScript
- MongoDB with Mongoose
- Bun runtime
- CORS
- UUID for unique identifiers

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
