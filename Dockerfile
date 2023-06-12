FROM php:8.1.20-zts-alpine3.18

RUN apk add --no-cache --update \
        nano \
        icu-dev \
        && docker-php-ext-configure pcntl --enable-pcntl \
        && docker-php-ext-install pcntl intl

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=composer /usr/bin/composer /usr/bin/composer

COPY . /var/app
WORKDIR /var/app

RUN composer --no-ansi --working-dir=/var/app --no-interaction install

EXPOSE 80

CMD ["/bin/sh", "-c", "php websocket.php"]