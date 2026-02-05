FROM php:8.2-fpm

COPY php.ini /usr/local/etc/php/

RUN apt-get update \
    && apt-get install -y default-mysql-client zlib1g-dev libzip-dev\
    && docker-php-ext-install pdo_mysql zip

RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
RUN php composer-setup.php
RUN php -r "unlink('composer-setup.php');"
RUN mv composer.phar /usr/local/bin/composer

WORKDIR /var/www
