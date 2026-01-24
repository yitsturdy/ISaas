# Laravel用 Dockerfile（PHP-FPM）
# マルチステージ：composerで依存をビルドして最終イメージは軽量に
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-progress --no-interaction --optimize-autoloader

FROM php:8.2-fpm
# システム依存パッケージ / PHP拡張
RUN apt-get update && apt-get install -y --no-install-recommends \
    zip unzip git libzip-dev libpng-dev libjpeg-dev libonig-dev libxml2-dev libicu-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath xml zip intl gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# アプリケーション本体をコピー（ホストの .dockerignore で不要ファイルを除外すること）
COPY --chown=www-data:www-data . /var/www/html

# vendor はビルドステージからコピー
COPY --from=vendor /app/vendor /var/www/html/vendor

# 権限設定
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]