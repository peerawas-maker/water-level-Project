const express = require('express');
const {readdirSync} = require('fs')
const cors = require('cors')

const port = 5000;


const app = express();
app.use(cors());
app.use(express.json())







const prisma = require("./config/prismaconfig");
const mqtt = require("mqtt");
const { send } = require('process');

const brokerHost = "broker.emqx.io";
const brokerPort = 1883;
const subscribeTopic = "peerawas/water";
const publishTopic = "peerawas/water";

const brokerUrl = `mqtt://${brokerHost}:${brokerPort}`;
const clientId = "NodeClient-" + Math.random().toString(16).substr(2, 8);

let latestMqttMessage = {
  topic: "N/A",
  payload: "No data received yet.",
  receivedAt: null,
};
const client = mqtt.connect(brokerUrl, {
  clientId: clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

client.on("connect", () => {
  client.subscribe(subscribeTopic, (err) => {
    if (!err) {
      console.log(`Subscribed to topic: ${subscribeTopic}`);
      client.publish(
        publishTopic,
        `Client ${clientId} connected and listening.`,
        { qos: 0, retain: false }
      );
    } else {
      console.error(`Subscription error: ${err}`);
    }
  });
});

client.on("message", async (topic, payload) => {
  try {
    const payloadString = payload.toString();
    const data = JSON.parse(payloadString);

    console.log(data)
    const { distance_cm , level_cm, percent,ts } = data;

    await prisma.waterdata.create({
      data: {
        distance_cm,
        level_cm,
        percent,
        ts,
      },
    });

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    await prisma.waterdata.deleteMany({
      where: {
        createat: {
          lt: threeHoursAgo, 
        },
      },
    });
  } catch (err) {
    console.error("Error fetching data from database:", err);
  }
});

client.on("error", (error) => {
  console.error("MQTT Connection Error: ", error);
});







app.get('/',async (req,res)=>{
    try {
        const sen = await prisma.waterdata.findFirst({
            orderBy:{
                createat:'desc'
            }
        })
        res.json(sen)
    } catch (error) {
        res.status(500).json({msg:'err now'})
    }

})

app.get('/all',async (req,res)=>{
    try {
        const sen = await prisma.waterdata.findMany()
        res.json(sen)
    } catch (error) {
        res.status(500).json({msg:'err now'})
    }

})



app.listen(port, () => {    
    console.log('Open web')
});



