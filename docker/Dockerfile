# Use the official Nginx image as the base image
FROM nginx:latest

# Copy the HTML file into the container
COPY ../example/index.html /usr/share/nginx/html

# Copy the alice_avatar folder into the container
COPY . /usr/share/nginx/html/alice_avatar

# Copy the static folder into the container
COPY static /usr/share/nginx/html/static

# Create tts directory
RUN mkdir -p /usr/share/nginx/html/tts

# Create a configuration file to deny access to the alice_avatar folder
RUN echo "server { listen 80; location /alice_avatar { deny all; } }" > /etc/nginx/conf.d/deny.conf

# Configure Nginx to serve .mjs and .html files with the correct MIME types
RUN echo 'types { application/javascript mjs; text/html html; text/css css; application/javascript js; }' > /etc/nginx/mime.types

# Expose port 80 to the outside world
EXPOSE 80
