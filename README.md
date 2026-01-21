# Crypto Price Streaming

A high-performance, real-time cryptocurrency price streaming service built with TypeScript. This project uses Protocol Buffers for efficient data serialization and gRPC-style communication to deliver live market updates.

## 🚀 Features

* **Real-time Streaming**: Low-latency price updates for various cryptocurrency pairs.
* **Type-Safe Schema**: Uses [Buf](https://buf.build/) and Protocol Buffers (`.proto`) to define the price feed service, ensuring strict data contracts between provider and consumer.
* **Monorepo Structure**: Organized using `pnpm` workspaces for modularity.
* **Deterministic Environment**: Includes a `flake.nix` file for consistent development environments across different machines.

## 🛠 Tech Stack

* **Language**: [TypeScript](https://www.typescriptlang.org/) (72%) & JavaScript.
* **Data Serialization**: [Protocol Buffers](https://protobuf.dev/) (via Buf).
* **Package Manager**: [pnpm](https://pnpm.io/).
* **Environment**: [Nix / Flakes](https://nixos.org/).

## 📁 Project Structure

* `/proto`: Contains the service definitions (`pricefeed/v1`).
* `/packages`: Contains the core logic for the price streaming engine.
* `buf.yaml`: Configuration for the Buf CLI to manage Protobuf files.
* `flake.nix`: Declarative shell environment for developers.

## 🚦 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/installation)
* (Optional) [Nix](https://nixos.org/download.html) with Flakes enabled for the automated dev environment.

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/jasmitha8/crypto-price-streaming.git
cd crypto-price-streaming

```


2. **Enter the development shell (if using Nix):**
```bash
nix develop

```


3. **Install dependencies:**
```bash
pnpm install

```



### Running the Application

To start the price streaming service, you can use the provided helper script:

```bash
chmod +x run.sh
./run.sh

```
