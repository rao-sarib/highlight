FROM node:20-alpine

WORKDIR /app

# Copy package files (we will copy everything since we're setting up for dev)
# If package.json isn't present yet, mounting in dev mode will let the user scaffold it inside or via terminal later.
COPY . .

# Expose port (Next.js defaults to 3000)
EXPOSE 3000

# Command to run the frontend in development mode
# During dev sprint, running npm install if package.json exists, then npm run dev
CMD sh -c "if [ -f package.json ]; then npm install && npm run dev; else echo 'No package.json found. Waiting...' && tail -f /dev/null; fi"
