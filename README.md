# Kamadan Trade Chat
Client/Server solution to read in trade messages and provide a web front-end. Uses GWCA to interface with the Guild Wars client, and NodeJS to provide a web facing server.

## Client Setup
1. Run Guild Wars
2. Compile and run client, inject using au3 script. Client dll must be in same folder as au3 script.

## Server Setup
1. Install NodeJS
2. Run `npm install` from /server folder
3. Server is now running on `http://localhost` or `http://172.0.0.1`

## API Documentation

### Notes
* All timestamps are UTC
* All API responses are in JSON format
* See live examples of the below API endpoints on the HTML page @ http://localhost/

---
__Endpoint:__ ws://localhost:80<br/>
__Description:__ Websocket connection, allows clients to receive message in real-time as they come in.<br/>
__Example:__
```
RESPONSE PACKET:
{"s":"Circus Of Horrors","m":"WTS Clockwork Scythe Q9 pm offer WTB CC FC Q9 pm offer ","t":1581706017,"h":"f8L2Q9HecE"}
```
---
__Endpoint:__ http://localhost/m<br/>
__Description:__ Used to fetch the latest trade messages. 
Returns HTTP 200 with JSON encoded array of trade messages, or HTTP 304 (Not Modified) if there have been no new messages.<br/>
__Headers:__<br/>
__*If-None-Match*__ (Optional) The hash of the latest trade message. The server will respond with all messages since this one.
If no valid hash is given, the server will respond with the most recent 100 trade messages.<br/>
__Example:__
```
REQUEST HEADERS:

GET /m HTTP/1.1
Host: localhost
if-none-match: V7v5jSivAY

RESPONSE HEADERS:

HTTP/1.1 200 OK
etag: IA7wKgn4MN
Content-Type: application/json; charset=utf-8

RESPONSE BODY:
[
  {"s":"Baby Sugardoll","m":"WTB RESTO FROGGY pm me","t":1581704474,"h":"IA7wKgn4MN"},
  {"s":"Thyrion Asuryan","m":"WTS gift of the traveler X5 5e each","t":1581704460,"h":"bP7zkbKcRs"},
  {"s":"A L V E U S","m":"WTT Celestials (Me) pig or Dog btwn (you) Rat all unded can add few ectos","t":1581704451,"h":"GZprS7b7Zm"},
  {"s":"Xu Li Pam","m":"wtb vs q9 400e","t":1581704446,"h":"xoDXZvADes"},
  {"s":"Planinum Illuminati","m":"WTB Diessa Chalice 5E/ea I Shards 4A/stk I GotT 15/1A I Elite Tomes 2e/ea I Superb Charr Carvings 1a/stk","t":1581704440,"h":"4loyLWJlFs"}
]
```
---
__Endpoint__: http://localhost/s/<search_term><br/>
__Description:__ Used to search for trade messages. Returns HTTP 200 with JSON encoded array of trade messages.
__Example:__
```
REQUEST HEADERS:

GET /s/eternal%20blade HTTP/1.1
Host: localhost

RESPONSE HEADERS:

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
ETag: "rZJ64ws4R0vSnPPuM6MGcQ=="

RESPONSE BODY:
[
  {"h":"XkGxUHXUMF","t":1581704832,"s":"Nemesis Asheth","m":"WTB Delicious Cake x82, 1e/each"},
  {"h":"umRQDxcVhP","t":1581540741,"s":"Ron The Spirit","m":"WTS ~~ Cupcakes 20e ea ~~"},
  {"h":"v5TjyGLnSN","t":1581540663,"s":"A Noise In The Dark","m":"wts 54 cupcakes"}
]
```
---
__Endpoint__: http://localhost/u/<player_name><br/>
__Description:__ Used to fetch trade messages by player. Returns HTTP 200 with JSON encoded array of trade messages.
__Example:__
```
REQUEST HEADERS:

GET /u/agonizing%20blades HTTP/1.1
Host: localhost

RESPONSE HEADERS:

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
ETag: "rZJ64ws4R0vSnPPuM6MGcQ=="

RESPONSE BODY:
[
  {"h":"1581708548PfE","t":1581708548,"s":"Agonizing Blades","m":"WTS EL Tonics Vekk,Livia,Melonni,Goren,Morgahn,Margrid,Norgu,Pyre,Tahlkora,Ogden,Hayda,Dunkoro  AND UNDED MINIS PM ME"},
  {"h":"1581708181kOU","t":1581708181,"s":"Agonizing Blades","m":"WTS EL Tonics Vekk,Livia,Melonni,Goren,Morgahn,Margrid,Norgu,Pyre,Tahlkora,Ogden,Hayda,Dunkoro PM ME"},
  {"h":"1581708149Hlt","t":1581708149,"s":"Agonizing Blades","m":"WTS Tonics Vekk,Livia,Melonni,Goren,Morgahn,Margrid,Norgu,Pyre,Tahlkora,Ogden,Hayda,Dunkoro PM ME"}
]
```
