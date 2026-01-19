# Twitch RSS Tracker

A lightweight Node.js application that tracks Twitch channels and generates an RSS feed when they go live.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended, Dockerfile uses v24)
- npm

## Getting Started

### Local Development

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the application:**

    ```bash
    # Standard start
    npm run start

    # Development mode (with watch)
    npm run dev
    ```

### Docker

1.  **Build the image:**

    ```bash
    docker build -t twitch-tracker .
    ```

2.  **Run the container:**
    ```bash
    docker run -p 3000:3000 -v $(pwd)/data:/app/data twitch-tracker
    ```
    _Note: The volume mount `-v` is optional but recommended if you want to persist the `channels.json` changes._

## Configuration

You can configure the application using environment variables:

| Variable   | Default | Description                     |
| :--------- | :------ | :------------------------------ |
| `PORT`     | `3000`  | The port the server listens on. |
| `RSS_PATH` | `/rss`  | The URL path for the RSS feed.  |

## Usage

### RSS Feed

Access the RSS feed at:
`http://localhost:3000/rss` (or your configured `RSS_PATH`)

### Managing Channels

The application reads channels from `data/channels.json`. You can modify this file directly to add or remove channels.
