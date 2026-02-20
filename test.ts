import { getConfig, getVideoCaptions } from "@celluloid/peertube-api";
import { createClient } from "@celluloid/peertube-api/client";
import { ParseErrorCode, parseResponse } from "media-captions";

// const client = createClient({
//   baseUrl: 'https://video.mshparisnord.fr',
// })

// "https://video.mshparisnord.fr/w/4hMUL4QVGzmx48daxGvj4h"

// const videoInfo = await getVideo({
//   client,
//   path: {
//     id: '4hMUL4QVGzmx48daxGvj4h',
//   },
// })

// const {data} = await getVideoCaptions({
//   client,
//   path: {
//     id: '4hMUL4QVGzmx48daxGvj4h',
//   },
// })

const client = createClient({
	baseUrl: "https://celluloid.cloud",
});
const { data: config } = await getConfig({
	client,
});
console.log(config.serverVersion);

const { data: captions } = await getVideoCaptions({
	client,
	path: {
		id: "44ue5wyhSCv7w1tPGTxrtt",
	},
});

console.log(JSON.stringify(captions, null, 2));

const result = await parseResponse(fetch(captions?.data[0].fileUrl));

console.log(JSON.stringify(result, null, 2));
