import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import { UserResolver } from './UserResolver';
import { verify } from 'jsonwebtoken';
import { User } from './entity/Entities';
import { createAccessToken, createRefreshToken, sendRefreshToken } from './AccessToken';
import { createServer } from 'https';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { ChatResolver } from './ChatResolver';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

/* Steps to create self-signed cert...
-----------------------
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
-----------------------
*/

const mediasoup = require('mediasoup');

let worker: any; // A worker represents a mediasoup C++ subprocess that runs in a single CPU core and handles Router instances
let rooms: any = {};
let peers: any = {}; // A peer is not webRTC related, but is being used as a container to hold all routers, transports, producers, and consumers
let transports: any = []; // A transport connects an endpoint with a mediasoup router and enables transmission of media in both directions by means of Producer, Consumer
let producers: any = []; // A producer represents an audio or video source being injected into a mediasoup router.
let consumers: any = []; // A consumer represents an audio or video remote source being transmitted from the mediasoup router to the client application through a WebRTC transport.
let inRoom: boolean = false;

let app: any;
let httpServer: any;
let server: any;
let io: any;

const PORT = process.env.PORT || 4000;
const path = require('path');
const fs = require('fs');

/* const corsOrigin = 'http://127.0.0.1:3000'; */
const corsOrigin = 'https://achatapp.netlify.app';

// Digital Ocean IP
// '147.182.209.38'

const options = {
	key: fs.readFileSync(path.resolve(__dirname, 'key.pem')),
	cert: fs.readFileSync(path.resolve(__dirname, 'cert.pem'))
};

let mediaCodecs = [
	{
		kind: 'audio',
		mimeType: 'audio/opus',
		clockRate: 48000,
		channels: 2
	},
	{
		kind: 'video',
		mimeType: 'video/VP8',
		clockRate: 90000,
		parameters: {
			'x-google-start-bitrate': 5000
		}
	}
];
(async () => {
	// Start Express Server
	createExpressServer();
	// Create connection for TypeORM
	await createConnection();
	await createApolloServer();
	await startServer();
	await socketEvents();

	httpServer.listen(PORT, () => {
		console.log('Express server has started');
	});

	// create a worker as soon as our application starts
	worker = createWorker();
})();

// Create mediasoup worker
async function createWorker() {
	worker = await mediasoup.createWorker();
	console.log(`worker pid ${worker.pid}`);

	worker.on('died', (_error: any) => {
		console.error('mediasoup worker has died');
		setTimeout(() => process.exit(1), 2000);
	});

	return worker;
}

// create webrtc transport for each router (room)
async function createWebRtcTransport(router: any) {
	return new Promise(async (resolve, reject) => {
		try {
			// https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
			const webRtcTransport_options = {
				listenIps: [
					{
						ip: '147.182.209.38' // replace with relevant IP address
						/* announcedIp: '192.168.1.245' */
					}
				],
				enableUdp: true,
				enableTcp: true,
				preferUdp: true
			};

			// router is passed in from socket event and is define in the rooms array
			let transport = await router.createWebRtcTransport(webRtcTransport_options);
			console.log(`transport id: ${transport.id}`);

			transport.on('dtlsstatechange', (dtlsState: any) => {
				if (dtlsState === 'closed') {
					transport.close();
				}
			});

			transport.on('close', () => {
				console.log('transport closed');
			});
			// resolve promise with transport
			resolve(transport);
		} catch (error) {
			reject(error);
		}
	});
}

function createExpressServer() {
	app = express();
	httpServer = createServer(options, app);
	app.use(
		cors({
			origin: corsOrigin,
			credentials: true
		})
	);
	// Include Cookie Parser for JWT
	app.use(cookieParser());
	// When client posts refresh_token path, check for valid access token and return new tokens
	app.post('/refresh_token', async (req: any, res: any) => {
		const token = req.cookies.jid;

		if (!token) {
			return res.send({ ok: false, accessToken: '' });
		}
		let payload: any = null;

		try {
			payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
		} catch (err) {
			console.log(err);
			return res.send({ ok: false, accessToken: '' });
		}

		const user = await User.findOne({ id: payload.userId });

		if (!user) {
			return res.send({ ok: false, accessToken: '' });
		}

		/* if (user.tokenVersion != payload.tokenVersion) {
			console.log(user.tokenVersion);
			console.log(payload.tokenVersion);
			return res.send({ ok: false, accessToken: "" });
		} */

		sendRefreshToken(res, createRefreshToken(user));

		return res.send({ ok: true, accessToken: createAccessToken(user) });
	});
}

async function createApolloServer() {
	// Create GraphQL schema, include resolvers
	const schema = await buildSchema({
		resolvers: [UserResolver, ChatResolver]
	});
	// Create apollo server, plugins are for playground in production and for subscription. Subscriptions were discontinued in Apollo, so this is the workaround that is documented in their docs
	server = new ApolloServer({
		schema,
		context: ({ req, res }) => ({ req, res }),
		plugins: [
			ApolloServerPluginLandingPageGraphQLPlayground(),
			{
				async serverWillStart() {
					return {
						async drainServer() {
							subscriptionServer.close();
						}
					};
				}
			}
		],
		introspection: true // Introspection is for GraphQL playground
	});

	const subscriptionServer = SubscriptionServer.create(
		{
			// This is the `schema` we just created.
			schema,
			// These are imported from `graphql`.
			execute,
			subscribe
		},
		{
			// This is the `httpServer` created above
			server: httpServer
			// This `server` is the instance returned from `new ApolloServer`.
			//path: "/subscriptions",
		}
	);
}

async function startServer() {
	// Use local port OR the port designated by Heroku
	// Start server and start listening on port
	await server.start();
	server.applyMiddleware({ app, cors: false, path: '/' });
	io = new Server(httpServer, {
		path: '/ws/',
		cors: { origin: [corsOrigin] }
	});
}

async function socketEvents() {
	io.on('connection', async function (socket: any) {
		const socketsStatus: any = {};
		console.log(socket.id, ' has connected to the socket.');
		// let roomName: any;
		// const socketId = socket.id;
		socketsStatus[socket.id] = {};

		socket.on('createWebRtcTransport', async ({ consumer }: any, callback: any) => {
			const roomName = peers[socket.id].roomName;
			const router = rooms[roomName].router;

			// client emits event and passes in consumer, which is used when creating the transport
			// returns a promise that then proceeds to append new transport into the transports array
			createWebRtcTransport(router).then(
				(transport: any) => {
					callback({
						params: {
							id: transport.id,
							iceParameters: transport.iceParameters,
							iceCandidates: transport.iceCandidates,
							dtlsParameters: transport.dtlsParameters
						}
					});
					addTransport(transport, roomName, consumer);
				},
				(error) => {
					console.log(error);
				}
			);
		});

		// Create webRTC transport for current router and append the transport onto the peers array
		const addTransport = (transport: any, roomName: any, consumer: any) => {
			transports = [...transports, { socketId: socket.id, transport, roomName, consumer }];

			peers[socket.id] = {
				...peers[socket.id],
				transports: [...peers[socket.id].transports, transport.id]
			};
		};

		// first function that gets called when user joins a room
		// begins all of the other login
		// appends room to you corresponding peer index ---> creates producer, then router, then consumer
		socket.on('joinRoom', async ({ roomName }: any, callback: any) => {
			console.log('ROOM NAME: ', roomName);
			const router1 = await createRoom(roomName, socket.id);
			if (router1) {
				inRoom = true;
			}
			peers[socket.id] = {
				socket,
				roomName,
				transports: [],
				producers: [],
				consumers: [],
				peerDetails: {
					name: '',
					isAdmin: false
				}
			};

			// get Router RTP Capabilities
			const rtpCapabilities = router1.rtpCapabilities;

			// retursn RTP capabilities of the router (room)
			callback({ rtpCapabilities });
		});

		// create room based on string passed from socket event and if room does not exist, create a router for that room. append router and peers onto room array
		const createRoom = async (roomName: any, socketId: any) => {
			let router1;
			let peers = [];

			// if room does not exist, create router for room, otherwise get the router and the peers within that router
			if (rooms[roomName]) {
				router1 = rooms[roomName].router;
				peers = rooms[roomName].peers || [];
			} else {
				router1 = await worker.createRouter({ mediaCodecs });
			}

			console.log(`Router ID: ${router1.id}`, peers.length);

			rooms[roomName] = {
				router: router1,
				peers: [...peers, socketId]
			};

			// return router
			return router1;
		};

		// array management --> adds new producer and the corresponding id/roomname into the peers array
		const addProducer = (producer: any, roomName: any) => {
			producers = [...producers, { socketId: socket.id, producer, roomName }];

			peers[socket.id] = {
				...peers[socket.id],
				producers: [...peers[socket.id].producers, producer.id]
			};
		};

		// array management --> adds new consumer and the corresponding id/roomname into the peers array
		const addConsumer = (consumer: any, roomName: any) => {
			consumers = [...consumers, { socketId: socket.id, consumer, roomName }];

			peers[socket.id] = {
				...peers[socket.id],
				consumers: [...peers[socket.id].consumers, consumer.id]
			};
		};

		// returns array that contains all of the produces in a router
		socket.on('getProducers', (callback: any) => {
			const { roomName } = peers[socket.id];
			console.log(roomName);
			let producerList: any = [];
			producers.forEach((producerData: any) => {
				if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
					producerList = [...producerList, producerData.producer.id];
				}
			});

			callback(producerList);
		});

		// broadcasts new producer to peers already inside a router
		const informConsumers = (roomName: any, socketId: any, id: any) => {
			console.log(`just joined, id ${id}, ${roomName}, ${socketId}`);
			producers.forEach((producerData: any) => {
				if (producerData.socketId !== socketId && producerData.roomName === roomName) {
					const producerSocket = peers[producerData.socketId].socket;
					// Let consumers know a new producer has joined and create the transport for that producer
					producerSocket.emit('new-producer', { producerId: id });
				}
			});
		};

		// get the transport for the current socket
		const getTransport = (socketId: any) => {
			const [producerTransport] = transports.filter(
				(transport: any) => transport.socketId === socketId && !transport.consumer
			);
			return producerTransport.transport;
		};

		// connects the producer transport
		socket.on('transport-connect', async ({ dtlsParameters }: any) => {
			console.log('DTLS PARAMS: ...', { dtlsParameters });
			getTransport(socket.id).connect({ dtlsParameters });
		});

		// new producer streams to consumers in router
		socket.on('transport-produce', async ({ kind, rtpParameters }: any, callback: any) => {
			const producer = await getTransport(socket.id).produce({
				kind,
				rtpParameters
			});

			const { roomName } = peers[socket.id];

			addProducer(producer, roomName);

			informConsumers(roomName, socket.id, producer.id);

			console.log('Producer ID: ', producer.id, producer.kind);

			producer.on('transportclose', () => {
				console.log('transport closed');
				producer.close();
			});

			callback({
				id: producer.id,
				producersExist: producers.length > 1 ? true : false
			});
		});

		socket.on(
			'transport-recv-connect',
			async ({ dtlsParameters, serverConsumerTransportId }: any) => {
				console.log('DTLS PARAMS: ...', { dtlsParameters });
				const consumerTransport = transports.find(
					(transportData: any) =>
						transportData.consumer &&
						transportData.transport.id == serverConsumerTransportId
				).transport;

				await consumerTransport.connect({ dtlsParameters });
			}
		);

		socket.on(
			'consume',
			async (
				{ rtpCapabilities, remoteProducerId, serverConsumerTransportId }: any,
				callback: any
			) => {
				try {
					const { roomName } = peers[socket.id];
					const router = rooms[roomName].router;
					let consumerTransport = transports.find(
						(transportData: any) =>
							transportData.consumer &&
							transportData.transport.id === serverConsumerTransportId
					).transport;
					if (
						router.canConsume({
							producerId: remoteProducerId,
							rtpCapabilities
						})
					) {
						const consumer = await consumerTransport.consume({
							producerId: remoteProducerId,
							rtpCapabilities,
							paused: true
						});

						consumer.on('transportclose', () => {
							console.log('transport close from consumer');
						});

						consumer.on('producerclose', () => {
							console.log('producer of consumer closed');
							socket.emit('producer-closed', { remoteProducerId });
							consumerTransport.close([]);
							transports = transports.filter(
								(transportData: any) =>
									transportData.transport.id !== consumerTransport.id
							);
							consumer.close();
							consumers = consumers.filter(
								(consumerData: any) => consumerData.consumer.id !== consumer.id
							);
						});

						addConsumer(consumer, roomName);

						const params = {
							id: consumer.id,
							producerId: remoteProducerId,
							kind: consumer.kind,
							rtpParameters: consumer.rtpParameters,
							serverConsumerId: consumer.id
						};

						callback({ params });
					}
				} catch (err) {
					console.log(err.message);
					callback({
						params: {
							error: err
						}
					});
				}
			}
		);

		const removeItems = (items: any, type: any) => {
			items.forEach((item: any) => {
				if (item.socketId === socket.id) {
					item[type].close();
				}
			});
			items = items.filter((item: any) => item.socketId !== socket.id);

			return items;
		};

		socket.on('consumer-resume', async ({ serverConsumerId }: any) => {
			console.log('consumer resume');
			const { consumer } = consumers.find(
				(consumerData: any) => consumerData.consumer.id === serverConsumerId
			);
			await consumer.resume();
		});

		socket.on('disconnect', () => {
			if (inRoom) {
				console.log('=============================================');

				// array cleanup
				console.log('peer disconnected');
				consumers = removeItems(consumers, 'consumer');
				producers = removeItems(producers, 'producer');
				transports = removeItems(transports, 'transport');
				if (peers[socket.id]) {
					if (peers[socket.id].roomName) {
						const { roomName } = peers[socket.id];

						delete peers[socket.id];

						// remove socket from room
						rooms[roomName] = {
							router: rooms[roomName].router,
							peers: rooms[roomName].peers.filter(
								(socketId: any) => socketId !== socket.id
							)
						};
					}
				}
			}
			inRoom = false;
		});

		socket.on('leaveRoom', () => {
			if (inRoom) {
				console.log('*********************************************');
				console.log('peer disconnected');
				consumers = removeItems(consumers, 'consumer');
				producers = removeItems(producers, 'producer');
				transports = removeItems(transports, 'transport');
				if (peers[socket.id]) {
					if (peers[socket.id].roomName) {
						const { roomName } = peers[socket.id];
						delete peers[socket.id];

						rooms[roomName] = {
							router: rooms[roomName].router,
							peers: rooms[roomName].peers.filter(
								(socketId: any) => socketId !== socket.id
							)
						};
					}
				}
			}
			inRoom = false;
		});
	});
}
