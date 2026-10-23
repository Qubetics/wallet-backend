FROM node:24.22.1

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies exactly as locked in package-lock.json
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .
EXPOSE 3000
CMD [ "npm", "run", "start" ]
