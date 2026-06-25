# Omnia Protocol Dashboard

A comprehensive web interface for monitoring, managing, and participating in the Omnia Protocol network. Built with Next.js 16, TypeScript, and a professional dark-themed UI.

## Features

### 🖥️ Node Monitor
- Real-time node status and health metrics
- Uptime tracking
- Connected peers list with latency and version information
- Latest block height and hash monitoring
- Auto-refreshing data (5-second intervals)

### 🗳️ Governance
- View active and completed proposals
- Voting interface with yes/no/abstain options
- Real-time vote tallies with percentage breakdowns
- Proposal metadata and deadlines
- Status tracking (pending, voting, passed, failed, executed)

### ✅ Validators
- Active, inactive, and slashed validator tabs
- Voting power distribution
- Commission rates
- Slashing event tracking
- Performance metrics

### 💰 Economics
- Token transfer history and monitoring
- Balance and distribution tracking
- Transfer status (pending, confirmed, failed)
- Network volume statistics
- Token denomination (UBC)

### 📊 Events
- Real-time event stream
- Event type categorization and statistics
- Expandable event details with JSON payloads
- Color-coded event types (Block, Vote, Proposal, Slash, Transfer)
- 200-event rolling history

## Architecture

### Core Components

**API Client** (`lib/api-client.ts`)
- Type-safe API wrapper with Zod validation
- JWT authentication support
- Comprehensive error handling
- Methods for all major endpoints

**Configuration Context** (`lib/config-context.tsx`)
- Global state management for API endpoint and token
- localStorage persistence
- Seamless configuration updates

**Sidebar Navigation** (`components/sidebar.tsx`)
- Dark-themed navigation with active state highlighting
- Quick-access settings and disconnect buttons
- Consistent styling across all pages

**Config Modal** (`components/config-modal.tsx`)
- User-friendly connection dialog
- Input validation
- Error messaging

### Pages

All pages follow a consistent pattern:
- Real-time data fetching with SWR
- Auto-refresh at configurable intervals
- Error boundaries with user messaging
- Responsive grid layouts
- Professional card-based design

## Configuration

### Initial Setup

1. **Start the application**: The dashboard will prompt you to connect to your node
2. **Enter API Endpoint**: `https://your-node-domain:8080` (or `http://localhost:8080` for local)
3. **Provide JWT Token**: Obtain from your node operator
4. **Connect**: Configuration is saved to localStorage for persistence

### Updating Configuration

- Click **Configure** in the sidebar to update endpoint or token
- Use **Disconnect** to clear configuration and reset

## API Integration

The dashboard connects to the Omnia Protocol REST API with the following endpoints:

```
GET /api/node/status           # Node status and metrics
GET /api/node/peers            # Connected peers list
GET /api/governance/proposals  # Active proposals
GET /api/economics/validators  # Validator list
GET /api/economics/balances/{address}
GET /api/economics/transfers   # Transfer history
GET /api/events                # Event stream
POST /api/governance/proposals/{id}/vote
```

### Authentication

All requests include JWT bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

## Data Refresh Intervals

- **Node Status**: 5 seconds
- **Peers**: 10 seconds
- **Governance**: 10 seconds
- **Validators**: 15 seconds
- **Economics**: 10 seconds
- **Events**: 5 seconds

These are configurable in each page's SWR configuration.

## Design System

### Colors (Dark Theme)
- **Background**: `#1f1f2d` (Deep navy)
- **Card**: `#2a2a42` (Slightly lighter)
- **Primary**: `#a78bfa` (Indigo/purple accent)
- **Accent**: `#65a6ff` (Blue)
- **Destructive**: `#f87171` (Red for errors)
- **Foreground**: `#f1f5f9` (Light text)

### Typography
- **Headings**: Geist Sans (via Next.js)
- **Body**: Geist Sans
- **Code/Data**: Geist Mono

### Components
- Custom shadcn/ui components (Button, Card, Dialog, Input, Label, Progress)
- Lucide icons for consistent iconography
- Responsive Tailwind CSS grid layouts

## Performance Considerations

- **SWR Caching**: Automatic request deduplication and caching
- **Polling Strategy**: Server-side intervals prevent excessive requests
- **Lazy Loading**: Pages load data independently
- **Responsive Design**: Mobile-first CSS with responsive breakpoints

## Error Handling

- API errors displayed as dismissible alerts
- Graceful fallbacks for missing data
- Loading states during data fetching
- Configuration validation with user feedback

## Development

### Add a New Page

1. Create `/app/[section]/page.tsx`
2. Use `useConfig()` hook for API client
3. Implement SWR data fetching
4. Follow existing card/table patterns
5. Add route to sidebar navigation

### Customize Colors

Edit `app/globals.css` in the `.dark` section to adjust the theme:

```css
--primary: oklch(0.65 0.21 264);  /* Purple accent */
--background: oklch(0.12 0 0);    /* Dark background */
```

## Deployment

### Prerequisites
- Node.js 18+
- A running Omnia Protocol node with REST API enabled
- Valid JWT token for authentication

### Build & Deploy
```bash
pnpm install
pnpm build
pnpm start
```

### Environment Variables
No environment variables required - configuration is provided through the UI.

## Security Notes

- JWT tokens are stored in localStorage (client-side only)
- All API requests are authenticated via token
- Configuration can be updated/cleared at any time
- No sensitive data is logged to console in production

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (responsive design)

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Local transaction simulation
- [ ] Advanced filtering and search
- [ ] Export data functionality
- [ ] Custom dashboards and widgets
- [ ] Analytics and historical charts
- [ ] Validator performance graphs
- [ ] Multi-account management
- [ ] Offline mode with caching

## Troubleshooting

### Cannot Connect to Node
- Verify the API endpoint is correct and accessible
- Check JWT token validity
- Ensure CORS is enabled on your node (if remote)
- Check browser console for detailed error messages

### Data Not Refreshing
- Verify network connection
- Check if token has expired
- Look for API errors in browser console
- Try refreshing the page

### Styling Issues
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check that dark mode is enabled in browser

## Support

For issues, questions, or feature requests related to the dashboard, please refer to the main Omnia Protocol repository documentation.
