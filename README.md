# node-bitcoin-explorer

This is mostly intended as a demo application for
[node-bitcoin-p2p](https://github.com/justmoon/node-bitcoin-p2p/). It
replicates most of the functionality of the popular [Block
Explorer](http://blockexplorer.com/) website.

# Installation

Before you install `node-bitcoin-explorer`, make sure you have
(node-bitcoin-p2p)[https://github.com/bitcoinjs/node-bitcoin-p2p]
installed.

``` sh
# Get node-bitcoin-explorer
git clone git://github.com/justmoon/node-bitcoin-explorer.git --recursive

# Go to folder
cd node-bitcoin-explorer

# Link to global bitcoin-p2p installation
npm link bitcoin-p2p

# Install dependencies
npm install
```

# Usage

To start the server

    node app.js

The application will be visible on http://localhost:3000/
