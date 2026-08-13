# DISCLAIMER

## This solution was fully vibe coded; apply your own judgement.

# Pathfinder Puzzle 1 Armor Solver

A TypeScript monorepo using pnpm workspaces with a solver library and a native Foldkit frontend.

## Project Structure

- `packages/solver`: Core solver library
- `apps/frontend`: Foldkit frontend application with an immutable Effect Schema model
- `apps/model-tests`: Quint proof and `quint-connect-ts` model-based tests against the production reducer and solver

## Setup

```bash
pnpm install
```

## Scripts

### Root
- `pnpm build` - Build all packages and apps
- `pnpm test` - Run tests for all packages
- `pnpm dev:frontend` - Start the frontend development server

### Solver Library
- `pnpm --filter @app/solver build` - Build the solver library
- `pnpm --filter @app/solver test` - Run the solver library tests

### Frontend
- `pnpm --filter frontend dev` - Start the frontend development server
- `pnpm --filter frontend typecheck` - Type-check the frontend
- `pnpm --filter frontend test` - Run Foldkit Story and Scene tests
- `pnpm --filter frontend build` - Build the frontend for production
- `pnpm --filter frontend preview` - Preview the production build

### Formal model and model-based tests

- `pnpm --filter model-tests test` - Typecheck and run Quint scenarios, bounded verification, and generated trace replay against the production reducer and BFS distance
- `pnpm --filter model-tests test:quint` - Run the executable Quint scenarios
- `pnpm --filter model-tests verify:quint` - Verify puzzle-state invariants through its diameter and prove the exact shortest-path table for every board and target

## The Game

The game consists of 6 boolean values (tiles), each with associated "moves" that toggle specific tiles. First make every tile the same, then make that uniform board its opposite. The frontend application provides:

- Interactive game board
- Custom setup mode to set initial conditions
- Game completion detection
- Reset functionality

## Solver

The solver library uses breadth-first search to find optimal solutions to any game configuration.

## Deployment

### Vercel Deployment Instructions

This project is set up for Vercel deployment:

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com) and create a new project
3. Import your repository 
4. Use the default settings - everything is configured in vercel.json
5. Click "Deploy"

The build process will build all workspace packages and copy the frontend to the root dist directory.
