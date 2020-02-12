# kamadan-trade-chat
Setup for reading Kamadan AE1 trade chat, sending to NodeJS server and exposing web interface.

This project is designed to be run standalone with port 80 and 9090 exposed for http and websocket protocol, aswell as being able to run Guild Wars locally to read incoming trade messages.

## Client - GWCA based application that runs inside Guild Wars
1. Compile `kamadan-trade-chat.sln`
1. Load Guild Wars
2. Run `client/kamadan-trade-chat.au3` to inject. Might ask you to find the dll, but you can move to compiled dll into the same folder and it'll find it.

Client should start spewing trade messages over to `http://localhost/add`

## Server - NodeJS webserver for receiving and sending data
1. `cd server && npm install`
2. `node server.js`

Will host a http page on port 80, and websocket connection on port 9090.
