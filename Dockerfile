# Use an official Node.js 18 runtime as the base image
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install all necessary system libraries for the Chrome browser.
# This is the definitive fix for the "shared libraries" error.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy the package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install your app's Node.js dependencies
RUN npm install

# Copy the rest of your application's source code into the container
COPY . .

# Expose the port that the app will run on
EXPOSE 4000

# The command to run when the container starts
CMD [ "npm", "start" ]

