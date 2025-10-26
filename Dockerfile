FROM ubuntu:latest

# Install necessary packages
RUN apt-get update && apt-get install -y \
    wget \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Go
ENV GO_VERSION=1.23.2
RUN wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz && \
    rm go${GO_VERSION}.linux-amd64.tar.gz

# Set up Go environment
ENV PATH=$PATH:/usr/local/go/bin:/root/go/bin
ENV GOPATH=/root/go

# Install packwiz
RUN go install github.com/packwiz/packwiz@latest

# Install bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH=$PATH:/root/.bun/bin

WORKDIR /app

CMD ["tail", "-f", "/dev/null"]
