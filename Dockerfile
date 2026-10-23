FROM node:24.22.1

# Create app directory
WORKDIR /usr/src/app
# Run as the unprivileged node user, which also owns the app folder
RUN chown node:node /usr/src/app
USER node

# Install app dependencies exactly as locked in package-lock.json
COPY --chown=node:node package*.json ./
RUN npm ci

# Bundle app source
COPY --chown=node:node . .
EXPOSE 3000
CMD [ "npm", "run", "start" ]
