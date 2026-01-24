# syntax=docker/dockerfile:1.4
ARG APP_NAME=app
ARG BUILD_TARGET=./cmd/server

FROM golang:1.21-alpine3.19 AS builder
RUN apk add --no-cache ca-certificates git
WORKDIR /src

# cache go modules
COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64

# Build (BuildKit cache mount speeds subsequent builds)
RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -ldflags="-s -w" -trimpath -o /app/${APP_NAME} ${BUILD_TARGET}

FROM scratch
# add CA certs for HTTPS clients
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/${APP_NAME} /app/${APP_NAME}

EXPOSE 8080
ENV PORT=8080

# run as non-root numeric user
USER 65532:65532

ENTRYPOINT ["/app/app"]