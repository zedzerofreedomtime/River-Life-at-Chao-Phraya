FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server ./cmd/server
FROM alpine:3.21
RUN adduser -D app && mkdir -p /data/uploads && chown app /data/uploads
USER app
COPY --from=build /server /server
EXPOSE 8080
CMD ["/server"]
