import { createClient } from "./client.js";

const client = createClient()

const data = await client.multi().set('hello', 'helloval').get('jkjkjvl').set('jkjkjvl', 'vajk').exec()

console.log(data)

