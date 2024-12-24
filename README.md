# VIP Draw

A real-time interactive drawing game, made in about a month as the final project for CSCC09.

Video showcase link: https://www.youtube.com/watch?v=AwOArrySZjE

Public URL: https://draw.tlandart.me (currently offline)

Stack:
- **React frontend** with next.js
  - Env-cmd to load environment variables
  - **Google OAuth** for third-party authentication
  - Tailwind CSS for UI
  - **PeerJS** for real-time player interaction
  - React-timer-hook for a timer component
- Nodejs backend server
  - Express for REST endpoints
  - Express-session to manage values related to user’s session
  - Cookie (the npm package) to serialize cookies
  - **Redis** database to store profiles and game identifications
  - Bcrypt for encrypting passwords securely 
  - Uuid to generate IDs for players
  - Google-auth-library for storing users who signed up with Google in the database
- **Google Cloud Platform** VM for deployment
  - Custom dockerfile for frontend and backend services
  - Custom docker compose file:
    - **NGINX** reverse proxy
    - NGINX acme companion for let’s encrypt
    - Frontend and backend services
    - Redis service that holds the database
