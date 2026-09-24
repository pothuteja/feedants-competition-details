Feedants - Competition Details Screen (Full-Stack)
A production-ready full-stack Competition Details feature built for the Feedants Mobile Application. This module features a dynamic MongoDB-driven backend, Express REST API, and a custom React Native (Expo) frontend reflecting the design specification.

🚀 Features Implemented
Dynamic MongoDB Backend: Data-driven rendering of competition details, reward breakdown tiers, judge profiles, and previous winners' media cards.

Atomic Registration Engine: Handles race conditions and concurrent user registrations using MongoDB $inc atomic operators to prevent overbooking past capacity.

Real-Time Countdown Timer: Time-dependent registration deadline ticker synchronized with competition lifecycle states.

Interactive UI: Tabbed navigation (About, Judging Parameters, Rules), dynamic spot allocation progress bars, and copy-to-clipboard referral links.

Payment Ready: Integrated structure supporting Razorpay payment workflows (Test Mode configuration).

🛠️ Required Environment Variables / Configuration
Create a .env file inside the backend directory with the following variables:

Code snippet
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/feedants?retryWrites=true&w=majority
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
📖 Instructions for Running the Application
Prerequisites
Node.js (v18 or higher)

Expo Go app on mobile OR Web Browser (Chrome/Edge)

MongoDB Atlas Cluster

1. Backend Setup & Database Seeding
Navigate to the backend directory:

```
cd backend
Install dependencies:
```
```
npm install
Seed the database with initial competition data:
```
```Bash
npm run seed
```
Start the backend Express server:
```
```Bash
npm run dev
```
The server will start running at http://localhost:5000.

2. Frontend Setup (React Native / Expo)
Navigate to the frontend directory:

```Bash
cd ../frontend
```
Install dependencies:

```Bash
npm install
```
Start the Metro Bundler:

```Bash
npx expo start
```
Running the app:

Web Browser: Press w in the terminal to view at http://localhost:8081.

Physical Mobile Device: Scan the generated QR code using the Expo Go application.


📌 Architecture & Design Decisions (README Requirements)
1. Important Assumptions Made
User Authentication Context: Assumed a mock active session (userId: "demo_user_123") to simulate real-time spot booking and registration state updates without forcing authentication screens first.

Single Active Competition Focus: Optimized initial state queries around the targeted competition ID while structuring routes to support dynamic /api/competitions/:id parameters seamlessly.

2. Major Technical Decisions
Atomic Database Operations: Used MongoDB's atomic $inc updates and optimistic validation check constraints (bookedSpots < totalSpots) during registration. This prevents race conditions and overbooking when thousands of concurrent users click "Register Now".

Expo Router Integration: Structured component layouts inside src/app/index.tsx to leverage native navigation stacks while hiding top navigation headers using <Stack.Screen false headerShown: options="{{" }}/> for UI control.

Modular Component Styling: Built custom inline layout structures to match design padding, color palettes, and typography metrics without reliance on heavy external UI kits.

3. Trade-offs Considered
Express API Polling vs. WebSockets: Implemented RESTful HTTP endpoints with local interval timers for real-time state countdowns. While WebSockets (Socket.io) offer sub-second state sync across multi-user sessions, REST endpoints significantly reduced infrastructure overhead for this baseline implementation while keeping API response latencies minimal.

Inline Image Asset Placeholders: Fallback image URIs are embedded within initial state parameters to guarantee UI consistency if external CDN assets experience high latency or network timeouts.

4. Production Improvements & Next Steps
Distributed Caching (Redis): Implement Redis caching layer for read-heavy competition detail endpoints to handle high-traffic concurrency without overwhelming primary database clusters.

Webhook Handling: Complete server-to-server Razorpay payment verification webhooks to automatically release locked spots if payment sessions expire or fail.

Video Streaming Engine: Integrate HLS/DASH streaming video modals for judge introduction clips and winner submission previews.

