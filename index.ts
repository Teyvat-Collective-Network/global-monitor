import { exec } from "child_process";
import { Client, Events, IntentsBitField, TextChannel } from "discord.js";

const client = new Client({
    intents:
        IntentsBitField.Flags.Guilds |
        IntentsBitField.Flags.GuildMessages |
        IntentsBitField.Flags.MessageContent,
    sweepers: { messages: { lifetime: 1, interval: 60 } },
});

const promise = new Promise((r) => client.on(Events.ClientReady, r));
await client.login(Bun.env.TOKEN!);
await promise;

const items = new Set<string>();
let accumulator = 0;

client.on(Events.MessageCreate, async (message) => {
    if (message.channel.id !== Bun.env.TARGET) return;

    if (items.has(message.content)) {
        console.log(`${message.content} received; resetting.`);
        items.clear();
        accumulator = 0;
    }
});

const source = (await client.channels.fetch(Bun.env.SOURCE!)) as TextChannel;
const logs = (await client.channels.fetch(Bun.env.LOGS!)) as TextChannel;

let throttle = 0;

setInterval(async () => {
    if (throttle > 0) {
        console.log(`(throttled, ${throttle}...)`);
        return throttle--;
    }

    const uuid = crypto.randomUUID();
    items.add(uuid);
    await source.send(uuid);
    accumulator++;
    console.log(`Sending ${uuid} and accumulator is now ${accumulator}`);

    if (accumulator > 4) {
        await logs.send("Triggering restart...");
        exec("pm2 restart global-chat");
        items.clear();
        accumulator = 0;
        throttle = 4;
    }
}, 20000);
