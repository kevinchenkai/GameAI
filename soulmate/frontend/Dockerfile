FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY settings.html /usr/share/nginx/html/
COPY settings.js /usr/share/nginx/html/
COPY images/ /usr/share/nginx/html/images/

EXPOSE 80
